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
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
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
      const [cards, setCards] = useState([]);
      const [columns] = useState(defaultCols);
      const [activeCard, setActiveCard] = useState(null);
      const [loading, setLoading] = useState(true);
      const [selectedModule, setSelectedModule] = useState(null);

      useEffect(() => {
        const fetchKanbanData = async () => {
          if (!submission || !submission.user_id || !submission.course_id) {
            setLoading(false);
            return;
          }
          setLoading(true);
          try {
            const { data, error } = await supabase.rpc('get_admin_kanban_module_statuses', {
              p_user_id: submission.user_id,
              p_course_id: submission.course_id,
            });

            if (error) throw error;
            
            const formattedData = data.map(item => ({...item, module_id: item.module_uuid }));
            setCards(formattedData || []);

          } catch (error) {
            console.error('Error fetching admin kanban data:', error);
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
      }, [submission, toast]);

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
            </div>
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
                  title={col.title}
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
        </div>
      );
    };

    export default AdminKanbanView;