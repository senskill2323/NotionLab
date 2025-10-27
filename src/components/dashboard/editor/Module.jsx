import React from 'react';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import FormationsPanel from '@/components/dashboard/modules/FormationsPanel';
import TicketsPanel from '@/components/dashboard/modules/TicketsPanel';
import ResourcesPanel from '@/components/dashboard/modules/ResourcesPanel';
import PersonalDataPanel from '@/components/dashboard/modules/PersonalDataPanel';
import BuilderPanel from '@/components/dashboard/modules/BuilderPanel';
import KanbanPanel from '@/components/kanban/KanbanPanel';
import AssistantPanel from '@/components/dashboard/modules/AssistantPanel';

const componentMap = {
  client_formations: FormationsPanel,
  client_tickets: TicketsPanel,
  client_resources: ResourcesPanel,
  client_personal_data: PersonalDataPanel,
  client_builder: BuilderPanel,
  client_kanban_formations: KanbanPanel,
  client_ai_assistant: AssistantPanel,
};

const DropIndicator = ({ side }) => {
  const positionClass = side === 'left' ? 'left-[-2px]' : 'right-[-2px]';
  return (
    <div className={`absolute top-0 bottom-0 w-1 h-full bg-primary rounded-full transform -translate-x-1/2 ${positionClass} z-20`}>
      <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

export const Module = ({ moduleKey, isOverlay, isDragging }) => {
  const Component = componentMap[moduleKey];
  const cardClasses = `h-full w-full transition-opacity ${isDragging && !isOverlay ? 'opacity-50' : 'opacity-100'}`;
  
  if (Component) {
      return <div className={cardClasses}><Component editMode={true} /></div>
  }
  return <Card className={cardClasses}>Module introuvable: {moduleKey}</Card>;
};

export const SortableModule = ({ col, rowId, dropIndicatorInfo }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.colId, data: { type: 'module', col, rowId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${col.span || 12} / span ${col.span || 12}`,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group touch-none">
      {dropIndicatorInfo && dropIndicatorInfo.colId === col.colId && (
        <DropIndicator side={dropIndicatorInfo.side} />
      )}
      <div {...listeners} className="absolute top-2 left-2 z-10 p-2 bg-card/70 backdrop-blur-sm rounded-full cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-5 w-5 text-card-foreground" />
      </div>
      <Module moduleKey={col.moduleKey} isDragging={isDragging} isOverlay={false} />
    </div>
  );
};
