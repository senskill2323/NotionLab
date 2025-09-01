import React from 'react';
import { SortableContext } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import KanbanCard from '@/components/kanban/KanbanCard';

const KanbanColumn = ({ id, title, cards, onCardClick }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  const cardIds = React.useMemo(() => cards.map((c) => c.status_id), [cards]);

  return (
    <div className="w-full md:w-1/4 flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-900/70 backdrop-blur-sm p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold text-white flex items-center justify-between">
          {title}
          <span className="text-sm font-normal bg-gray-700 text-gray-300 rounded-full px-2 py-1">
            {cards.length}
          </span>
        </h3>
      </div>
      <ScrollArea 
        ref={setNodeRef}
        className="bg-gray-800/50 rounded-b-lg p-4 flex-grow h-full"
      >
        <SortableContext items={cardIds}>
          {cards.map((card) => (
            <div key={card.status_id} onClick={() => onCardClick && onCardClick(card)}>
              <KanbanCard card={card} />
            </div>
          ))}
        </SortableContext>
      </ScrollArea>
    </div>
  );
};

export default KanbanColumn;