import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export const DroppableZone = ({ id }) => {
  const { isOver, setNodeRef } = useDroppable({ id, data: { type: 'dropzone' } });

  return (
    <div
      ref={setNodeRef}
      className={`h-16 my-2 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
        isOver ? 'bg-primary/20 border-primary' : 'border-muted-foreground/50'
      }`}
    >
      <span className="text-muted-foreground">Déposer ici pour créer une nouvelle ligne</span>
    </div>
  );
};