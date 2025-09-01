import React from 'react';
import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableModule } from './Module';

export const SortableRow = ({ row, activeId, dropIndicatorInfo, forbiddenRowId }) => {
    const { setNodeRef } = useSortable({ id: row.rowId, data: { type: 'row', row } });
    const { isOver } = useDroppable({ id: row.rowId, data: { type: 'row', row } });
    
    const isRowOver = isOver || row.columns.some(c => c.colId === activeId);
    const isForbidden = forbiddenRowId === row.rowId;

    return (
    <div ref={setNodeRef} className={`my-4 p-4 border rounded-md relative transition-all duration-200 ${isForbidden ? 'border-destructive bg-destructive/5' : isRowOver ? 'bg-primary/10 border-primary/50' : 'bg-muted/20'}`}>
        <SortableContext items={row.columns.map(c => c.colId)}>
        <div className="grid grid-cols-12 gap-4">
            {row.columns.map(col => <SortableModule key={col.colId} col={col} rowId={row.rowId} dropIndicatorInfo={dropIndicatorInfo} />)}
        </div>
        </SortableContext>
    </div>
    );
};