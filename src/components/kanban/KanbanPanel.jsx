import React, { useState, useEffect, useMemo } from 'react';
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
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import KanbanColumn from '@/components/kanban/KanbanColumn';
    import KanbanCard from '@/components/kanban/KanbanCard';
    import { Loader2, Workflow, TrendingUp, Zap } from 'lucide-react';
import ModuleHeader from '@/components/dashboard/ModuleHeader';

const defaultCols = [
  { id: 'todo', title: 'À faire' },
  { id: 'in_progress', title: 'En cours' },
  { id: 'blocked', title: 'Bloqué' },
  { id: 'done', title: 'Terminé' },
];

const KanbanPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState([]);
  const [columns] = useState(defaultCols);
  const [activeCard, setActiveCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchKanbanView = async () => {
      // Read from unified view; RLS on underlying table restricts to owner
      const { data, error } = await supabase
        .from('kanban_user_modules_v1')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data || [];
    };

    const enrichWithModuleMetadata = async (rows) => {
      const moduleIds = [...new Set(rows.map(r => r.module_uuid).filter(Boolean))];
      if (moduleIds.length === 0) return rows.map(item => ({ ...item, module_id: item.module_uuid }));

      const { data: modules, error: modErr } = await supabase
        .from('builder_modules')
        .select('id, title, description, duration')
        .in('id', moduleIds);
      if (modErr) throw modErr;
      const modMap = new Map((modules || []).map(m => [m.id, m]));
      return rows.map(item => {
        const m = modMap.get(item.module_uuid);
        return {
          ...item,
          module_id: item.module_uuid,
          title: m?.title ?? item.title ?? 'Module',
          description: m?.description ?? item.description ?? '',
          duration: m?.duration ?? item.duration ?? null,
        };
      });
    };

    const fetchKanbanOnly = async () => {
      setLoading(true);
      try {
        // Read-only: cards exist only after admin APPROVAL
        setInitializing(false);
        const rows = await fetchKanbanView();
        const formattedData = await enrichWithModuleMetadata(rows);
        setCards(formattedData || []);
      } catch (error) {
        console.error('Error fetching kanban data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les modules du Kanban.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchKanbanOnly();
  }, [user, toast, refreshTick]);

  // Realtime subscription: refresh when user's module statuses change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-kanban-channel-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'formation_module_statuses',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Trigger a refetch through the existing effect
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
  }, [user?.id]);

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
    try { console.debug('[KanbanPanel] onDragStart', { activeId: active?.id, card }); } catch (_) {}
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
    if (!over) {
      try { console.debug('[KanbanPanel] onDragEnd: no over target', { activeId: active?.id }); } catch (_) {}
      return;
    }
    // Do not early-return when active.id === over.id. The column may have changed during onDragOver.

    const originalCards = [...cards];
    let finalCards = [...cards];
    
    const activeIndex = finalCards.findIndex(c => c.status_id === active.id);
    const overIndex = finalCards.findIndex(c => c.status_id === over.id);
    
    if (activeIndex === -1) {
      try { console.debug('[KanbanPanel] onDragEnd: active card not found in state', { activeId: active?.id, cardIds: finalCards.map(c => c.status_id) }); } catch (_) {}
      return;
    }

    const newStatus = overIndex !== -1 ? finalCards[overIndex].status : over.id;
    try { console.debug('[KanbanPanel] onDragEnd', { activeId: active?.id, overId: over?.id, newStatus }); } catch (_) {}
    
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
        .throwOnError()
    );

    try {
      await Promise.all(dbUpdates);
      toast({ title: 'Succès', description: 'Le statut du module a été mis à jour.' });
    } catch (error) {
      try { console.error('[KanbanPanel] Error updating module status', error); } catch (_) {}
      setCards(originalCards);
      toast({ title: 'Erreur', description: 'La carte n\'a pas pu être déplacée.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border-2 border-gradient-to-r from-violet-500/20 via-blue-500/20 to-emerald-500/20 bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 dark:from-violet-900/20 dark:via-blue-900/20 dark:to-emerald-900/20 p-4 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-emerald-500/10 opacity-50"></div>
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 opacity-20 blur-lg"></div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 shadow-lg">
              <Workflow className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Kanban - Suivre mon évolution
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organisez et suivez vos modules de formation par statut
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Progression</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Efficace</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-br from-blue-900/10 to-gray-50 dark:from-blue-900/20 dark:to-gray-900 rounded-lg">
        {(cards?.length ?? 0) === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            En attente de validation de l’administrateur.
          </div>
        ) : (
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
                  title={col.title}
                  cards={cardsByColumn[col.id] || []}
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
        )}
      </div>
    </div>
  );
};

export default KanbanPanel;