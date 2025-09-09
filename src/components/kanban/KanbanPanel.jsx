import React, { useState, useEffect, useMemo } from 'react';
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
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import KanbanColumn from '@/components/kanban/KanbanColumn';
    import KanbanCard from '@/components/kanban/KanbanCard';
    import { Loader2 } from 'lucide-react';

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

      useEffect(() => {
        const fetchKanbanData = async () => {
          if (!user) return;
          setLoading(true);
          try {
            // Read from unified view; RLS on underlying table restricts to owner
            const { data, error } = await supabase
              .from('kanban_user_modules_v1')
              .select('*')
              .eq('user_id', user.id)
              .order('position', { ascending: true });

            if (error) throw error;

            const formattedData = (data || []).map(item => ({ ...item, module_id: item.module_uuid }));
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

        fetchKanbanData();
      }, [user, toast]);

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

      if (loading) {
        return (
          <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-900 to-black">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        );
      }

      return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-blue-900/20 to-black min-h-[calc(100vh-200px)]">
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
        </div>
      );
    };

    export default KanbanPanel;