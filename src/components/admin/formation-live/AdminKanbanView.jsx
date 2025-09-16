import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import KanbanCard from '@/components/kanban/KanbanCard';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const defaultCols = [
  { id: 'todo', title: 'À faire' },
  { id: 'in_progress', title: 'En cours' },
  { id: 'blocked', title: 'Bloqué' },
  { id: 'done', title: 'Terminé' },
];

// Enrichit les lignes avec les métadonnées des modules (titre, description, durée)
const enrichWithModuleMetadata = async (rows) => {
  const moduleIds = [...new Set((rows || []).map(r => r.module_uuid).filter(Boolean))];
  if (moduleIds.length === 0) {
    return (rows || []).map(item => ({
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (item.title && String(item.title).trim()) ? item.title : 'Module',
      description: (item.description && String(item.description).trim()) ? item.description : '',
      duration: item.duration ?? null,
    }));
  }

  const { data: modules, error: modErr } = await supabase
    .from('builder_modules')
    .select('id, title, description, duration')
    .in('id', moduleIds);
  if (modErr) {
    // En cas d'erreur, retourner quand même les lignes normalisées
    return (rows || []).map(item => ({
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (item.title && String(item.title).trim()) ? item.title : 'Module',
      description: (item.description && String(item.description).trim()) ? item.description : '',
      duration: item.duration ?? null,
    }));
  }
  const modMap = new Map((modules || []).map(m => [m.id, m]));
  return (rows || []).map(item => {
    const m = modMap.get(item.module_uuid);
    return {
      ...item,
      status_id: item.status_id ?? item.id,
      module_id: item.module_uuid,
      title: (m?.title && String(m.title).trim()) ? m.title : ((item.title && String(item.title).trim()) ? item.title : 'Module'),
      description: (m?.description && String(m.description).trim()) ? m.description : ((item.description && String(item.description).trim()) ? item.description : ''),
      duration: m?.duration ?? item.duration ?? null,
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

  useEffect(() => {
    const fetchKanbanData = async () => {
      if (!authReady) return;
      if (!submission || !submission.user_id) {
        setLoading(false);
        return;
      }

      // Dédoublonner les fetchs sur la même cible (user_id/course_id)
      const uid = submission.user_id;
      const cid = submission.course_id || null;
      if (lastFetchRef.current.user_id === uid && lastFetchRef.current.course_id === cid) {
        return;
      }
      lastFetchRef.current = { user_id: uid, course_id: cid };

      setLoading(true);
      setErrorMsg('');
      try {
        const isGlobal = !submission.course_id;

        if (!isGlobal) {
          // Mode formation spécifique: utiliser la RPC admin
          let res = await supabase
            .schema('admin')
            .rpc('get_admin_kanban_module_statuses', {
              p_user_id: submission.user_id,
              p_course_id: submission.course_id,
            });

          if (res.error) {
            // Fallback: schéma par défaut
            res = await supabase.rpc('get_admin_kanban_module_statuses', {
              p_user_id: submission.user_id,
              p_course_id: submission.course_id,
            });
          }

          if (res.error) throw res.error;

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
          const { data: subs, error: subsErr } = await supabase
            .from('formation_submissions')
            .select('id')
            .eq('user_id', submission.user_id)
            .eq('submission_status', 'approved');
          if (subsErr) throw subsErr;
          const subIds = (subs || []).map(s => s.id);
          let rows = [];
          if (subIds.length > 0) {
            const { data: viewRows, error: viewErr } = await supabase
              .from('kanban_user_modules_v1')
              .select('*')
              .in('submission_id', subIds);
            if (viewErr) throw viewErr;
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
          const { data: subs, error: subsErr } = await supabase
            .from('formation_submissions')
            .select('id')
            .eq('user_id', submission.user_id)
            .eq('course_id', submission.course_id)
            .eq('submission_status', 'approved');

          if (subsErr) throw subsErr;

          const subIds = (subs || []).map(s => s.id);
          if (subIds.length === 0) {
            setCards([]);
          } else {
            const { data: viewRows, error: viewErr } = await supabase
              .from('kanban_user_modules_v1')
              .select('*')
              .in('submission_id', subIds);

            if (viewErr) throw viewErr;

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
  }, [authReady, submission?.user_id, submission?.course_id]);

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
    if (!over || active.id === over.id) return;

    const originalCards = [...cards];
    let finalCards = [...cards];
    
    const activeIndex = finalCards.findIndex(c => c.status_id === active.id);
    const overIndex = finalCards.findIndex(c => c.status_id === over.id);
    
    if (activeIndex === -1) return;

    const newStatus = overIndex !== -1 ? finalCards[overIndex].status : over.id;
    
    finalCards[activeIndex] = { ...finalCards[activeIndex], status: newStatus };
    if (overIndex !== -1) {
      finalCards = arrayMove(finalCards, activeIndex, overIndex);
    }
    
    const cardsInNewCol = finalCards.filter(c => c.status === newStatus);
    const updates = cardsInNewCol.map((card, index) => ({
      ...card,
      position: index,
    }));

    const updatedState = finalCards.map(c => updates.find(u => u.status_id === c.status_id) || c);
    setCards(updatedState);

    const dbUpdates = updates.map(card => 
      supabase
        .from('formation_module_statuses')
        .update({ status: card.status, position: card.position })
        .eq('id', card.status_id)
    );

    const results = await Promise.all(dbUpdates);
    const hasError = results.some(res => res.error);

    if (hasError) {
      setCards(originalCards);
      toast({ title: 'Erreur', description: 'La carte n\'a pas pu être déplacée.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Le statut du module a été mis à jour.' });
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

  const totalCount = cards.length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la galerie
          </Button>
          <h2 className="text-2xl font-bold">{submission.course_title}</h2>
          <p className="text-muted-foreground">Progression de {submission.user_full_name}</p>
          {errorMsg && (
            <div className="mt-2 text-xs text-destructive">{errorMsg}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Diagnostics: user {String(submission.user_id)} {submission.course_id ? `· course ${String(submission.course_id)}` : '· global'}
          </div>
          <DndContext
            sensors={sensors}
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