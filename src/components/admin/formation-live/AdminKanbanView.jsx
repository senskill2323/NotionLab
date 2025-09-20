import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import KanbanCard from '@/components/kanban/KanbanCard';
import { Loader2 } from 'lucide-react';
import OnboardingBriefPanel from '@/components/admin/formation-live/OnboardingBriefPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const defaultCols = [
  { id: 'todo', title: 'À faire' },
  { id: 'in_progress', title: 'En cours' },
  { id: 'blocked', title: 'Bloqué' },
  { id: 'done', title: 'Terminé' },
];

// Enrichit les lignes avec les métadonnées des modules (titre, description, durée) et le nom de la formation
const enrichWithModuleMetadata = async (rows) => {
  const moduleIds = [...new Set((rows || []).map(r => r.module_uuid).filter(Boolean))];
  const submissionIds = [...new Set((rows || []).map(r => r.submission_id).filter(Boolean))];
  
  if (moduleIds.length === 0) {
    return (rows || []).map(item => ({
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (item.title && String(item.title).trim()) ? item.title : 'Module',
      description: (item.description && String(item.description).trim()) ? item.description : '',
      duration: item.duration ?? null,
      formation_name: null,
    }));
  }

  let modules = [];
  let formations = [];
  
  try {
    // Récupérer les métadonnées des modules
    const { data: moduleData } = await supabase
      .from('builder_modules')
      .select('id, title, description, duration')
      .in('id', moduleIds)
      .throwOnError();
    modules = moduleData || [];

    // Récupérer les noms des formations via les submissions
    if (submissionIds.length > 0) {
      // Approche plus directe : joindre les tables pour récupérer les noms de formation
      const { data: formationData } = await supabase
        .from('formation_submissions')
        .select(`
          id,
          course_id,
          courses!inner(title)
        `)
        .in('id', submissionIds)
        .throwOnError();
      
      formations = (formationData || []).map(f => ({
        id: f.id,
        course_title: f.courses?.title || 'Formation inconnue'
      }));
    }
  } catch (_) {
    // En cas d'erreur, retourner quand même les lignes normalisées
    return (rows || []).map(item => ({
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (item.title && String(item.title).trim()) ? item.title : 'Module',
      description: (item.description && String(item.description).trim()) ? item.description : '',
      duration: item.duration ?? null,
      formation_name: null,
    }));
  }

  const modMap = new Map((modules || []).map(m => [m.id, m]));
  const formationMap = new Map((formations || []).map(f => [f.id, f.course_title]));
  
  return (rows || []).map(item => {
    const m = modMap.get(item.module_uuid);
    const formationName = formationMap.get(item.submission_id);
    
    return {
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (m?.title && String(m.title).trim()) ? m.title : ((item.title && String(item.title).trim()) ? item.title : 'Module'),
      description: (m?.description && String(m.description).trim()) ? m.description : ((item.description && String(item.description).trim()) ? item.description : ''),
      duration: m?.duration ?? item.duration ?? null,
      formation_name: formationName || null,
    };
  });
};

const ModuleDetailDialog = ({ module, isOpen, onOpenChange }) => {
  if (!module) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{module.title}</DialogTitle>
          <DialogDescription>{module.family_name} &gt; {module.subfamily_name}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{module.description}</p>
          <div>
            <span className="font-semibold">Durée estimée:</span> {module.duration} minutes
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminKanbanView = ({ submission, onBack }) => {
  const { toast } = useToast();
  const { authReady } = useAuth();
  const [cards, setCards] = useState([]);
  const [columns] = useState(defaultCols);
  const [activeCard, setActiveCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const lastFetchRef = useRef({ user_id: null, course_id: null });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const fetchKanbanData = async () => {
      if (!authReady) return;
      if (!submission || !submission.user_id) {
        setLoading(false);
        return;
      }

      // Dédoublonner les fetchs sur la même cible (user_id/course_id) mais autoriser quand refreshTick change
      const uid = submission.user_id;
      const cid = submission.course_id || null;
      const tick = refreshTick;
      if (
        lastFetchRef.current.user_id === uid &&
        lastFetchRef.current.course_id === cid &&
        lastFetchRef.current.tick === tick
      ) {
        return;
      }
      lastFetchRef.current = { user_id: uid, course_id: cid, tick };

      setLoading(true);
      setErrorMsg('');
      try {
        const isGlobal = !submission.course_id;

        if (!isGlobal) {
          // Mode formation spécifique: utiliser la RPC admin
          let res;
          try {
            res = await supabase
              .schema('admin')
              .rpc('get_admin_kanban_module_statuses', {
                p_user_id: submission.user_id,
                p_course_id: submission.course_id,
              })
              .throwOnError();
          } catch (_) {
            // Fallback: schéma par défaut
            res = await supabase
              .rpc('get_admin_kanban_module_statuses', {
                p_user_id: submission.user_id,
                p_course_id: submission.course_id,
              })
              .throwOnError();
          }

          const rows = Array.isArray(res.data) ? res.data : [];

          console.debug('[AdminKanbanView] Loaded', {
            user_id: submission.user_id,
            course_id: submission.course_id,
            count: rows.length,
            via: 'rpc/get_admin_kanban_module_statuses',
          });
          const enriched = await enrichWithModuleMetadata(rows);
          setCards(enriched || []);
        } else {
          // Mode global: récupérer toutes les submissions LIVE de l'utilisateur puis interroger la vue
          const { data: subs } = await supabase
            .from('formation_submissions')
            .select('id')
            .eq('user_id', submission.user_id)
            .eq('submission_status', 'approved')
            .throwOnError();
          const subIds = (subs || []).map(s => s.id);
          let rows = [];
          if (subIds.length > 0) {
            const { data: viewRows } = await supabase
              .from('kanban_user_modules_v1')
              .select('*')
              .in('submission_id', subIds)
              .throwOnError();
            rows = viewRows || [];
          }

          console.debug('[AdminKanbanView] Loaded (global)', {
            user_id: submission.user_id,
            count: rows.length,
            via: 'view/kanban_user_modules_v1 by submission_ids',
          });
          const enriched = await enrichWithModuleMetadata(rows);
          setCards(enriched || []);
        }

      } catch (error) {
        console.error('Error fetching admin kanban data:', error);
        toast({
          title: 'Erreur',
          description: "Impossible de charger les modules du Kanban.",
          variant: 'destructive',
        });
        setErrorMsg(error?.message || 'Erreur RPC');

        // Fallback: récupérer d'abord les submissions approuvées puis interroger la vue par submission_id
        try {
          const { data: subs } = await supabase
            .from('formation_submissions')
            .select('id')
            .eq('user_id', submission.user_id)
            .eq('course_id', submission.course_id)
            .eq('submission_status', 'approved')
            .throwOnError();

          const subIds = (subs || []).map(s => s.id);
          if (subIds.length === 0) {
            setCards([]);
          } else {
            const { data: viewRows } = await supabase
              .from('kanban_user_modules_v1')
              .select('*')
              .in('submission_id', subIds)
              .throwOnError();
            const enriched = await enrichWithModuleMetadata(viewRows || []);
            setCards(enriched);
            setErrorMsg(prev => (prev ? `${prev} · Fallback OK` : ''));
          }
        } catch (fbErr) {
          console.error('Fallback Kanban view failed:', fbErr);
          setErrorMsg(prev => (prev ? `${prev} · Fallback KO` : 'Fallback KO'));
        }
      } finally {
        setLoading(false);
      }
    };

    let cancelled = false;
    (async () => {
      await fetchKanbanData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, submission?.user_id, submission?.course_id, refreshTick]);

  // Realtime subscription to reflect client/admin updates live
  useEffect(() => {
    if (!submission?.user_id) return;

    const channel = supabase
      .channel(`admin-kanban-channel-${submission.user_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'formation_module_statuses',
          filter: `user_id=eq.${submission.user_id}`,
        },
        () => {
          setRefreshTick((t) => t + 1);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // noop
      }
    };
  }, [submission?.user_id]);

  const cardsByColumn = useMemo(() => {
    const grouped = {};
    columns.forEach(col => {
      grouped[col.id] = cards
        .filter(card => card.status === col.id)
        .sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [cards, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const card = cards.find(c => c.status_id === active.id);
    setActiveCard(card);
    try { console.debug('[AdminKanbanView] onDragStart', { activeId: active?.id, card }); } catch (_) {}
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCards((prevCards) => {
      const activeIndex = prevCards.findIndex((c) => c.status_id === active.id);
      let overIndex = prevCards.findIndex((c) => c.status_id === over.id);

      if (activeIndex === -1) return prevCards;

      const activeCard = prevCards[activeIndex];
      const overIsColumn = columns.some(c => c.id === over.id);

      if (overIsColumn) {
        if (activeCard.status !== over.id) {
          const newCards = [...prevCards];
          newCards[activeIndex] = { ...activeCard, status: over.id };
          return newCards;
        }
        return prevCards;
      }

      const overIsCard = overIndex !== -1;
      if (overIsCard) {
        return arrayMove(prevCards, activeIndex, overIndex);
      }

      return prevCards;
    });
  };

  const handleDragEnd = async (event) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return; // allow persisting even if dropping over the same card id

    const originalCards = [...cards];
    let finalCards = [...cards];

    const activeIndex = finalCards.findIndex(c => c.status_id === active.id);
    const overIndex = finalCards.findIndex(c => c.status_id === over.id);

    if (activeIndex === -1) return;

    const newStatus = overIndex !== -1 ? finalCards[overIndex].status : over.id;
    try { console.debug('[AdminKanbanView] onDragEnd', { activeId: active?.id, overId: over?.id, newStatus }); } catch (_) {}

    finalCards[activeIndex] = { ...finalCards[activeIndex], status: newStatus };
    if (overIndex !== -1) {
      finalCards = arrayMove(finalCards, activeIndex, overIndex);
    }

    const cardsInNewCol = finalCards.filter(c => c.status === newStatus);
    const updates = cardsInNewCol.map((card, index) => ({
      ...card,
      position: index,
    }));
    try { console.debug('[AdminKanbanView] updates payload', updates); } catch (_) {}

    const updatedState = finalCards.map(c => updates.find(u => u.status_id === c.status_id) || c);
    setCards(updatedState);

    const dbUpdates = updates.map(card =>
      supabase
        .from('formation_module_statuses')
        .update({ status: card.status, position: card.position })
        .eq('id', card.status_id)
        .throwOnError()
    );

    try {
      await Promise.all(dbUpdates);
      toast({ title: 'Succès', description: 'Le statut du module a été mis à jour.' });
    } catch (error) {
      console.error('Error updating module status:', error);
      setCards(originalCards);
      toast({ title: 'Erreur', description: 'La carte n\'a pas pu être déplacée.', variant: 'destructive' });
    }
  };

  const handleCardClick = (card) => {
    setSelectedModule(card);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const isGlobalView = !submission?.course_id;
  const totalCount = cards.length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          {!isGlobalView && (<h2 className="text-2xl font-bold">{submission.course_title}</h2>)}
          {!isGlobalView && (<p className="text-muted-foreground">Progression de {submission.user_full_name}</p>)}
          {errorMsg && (
            <div className="mt-2 text-xs text-destructive">{errorMsg}</div>
          )}
          {!isGlobalView && submission?.user_id && (
            <div className="mt-4">
              <OnboardingBriefPanel userId={submission.user_id} />
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={`${col.title}`}
                  cards={cardsByColumn[col.id] || []}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
            {createPortal(
              <DragOverlay>
                {activeCard && <KanbanCard card={activeCard} isOverlay />}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
          <ModuleDetailDialog 
            module={selectedModule} 
            isOpen={!!selectedModule} 
            onOpenChange={() => setSelectedModule(null)} 
          />
          <div className="mt-4 text-xs text-muted-foreground">Total modules: {totalCount}</div>
          {totalCount === 0 && (
            <div className="mt-1 text-sm text-muted-foreground">Aucun module n'est encore présent dans le Kanban pour cette formation.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminKanbanView;


