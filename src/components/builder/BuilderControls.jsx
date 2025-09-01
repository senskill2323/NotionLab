import React from 'react';
import { useReactFlow } from 'reactflow';
import { ZoomIn, ZoomOut, Locate, Wand2, Undo2, Redo2, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export const BuilderControls = ({ 
    onClean, 
    onUndo, 
    onRedo, 
    canUndo, 
    canRedo,
    onDuplicate,
    onDelete,
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const controls = [
    { label: 'Annuler', icon: <Undo2 className="w-4 h-4" />, onClick: onUndo, disabled: !canUndo },
    { label: 'Rétablir', icon: <Redo2 className="w-4 h-4" />, onClick: onRedo, disabled: !canRedo },
    { label: 'Dupliquer', icon: <Copy className="w-4 h-4" />, onClick: onDuplicate },
    { label: 'Supprimer', icon: <Trash2 className="w-4 h-4" />, onClick: onDelete },
    { label: 'Zoomer', icon: <ZoomIn className="w-4 h-4" />, onClick: () => zoomIn({ duration: 300 }) },
    { label: 'Dézoomer', icon: <ZoomOut className="w-4 h-4" />, onClick: () => zoomOut({ duration: 300 }) },
    { label: 'Centrer', icon: <Locate className="w-4 h-4" />, onClick: () => fitView({ duration: 300 }) },
    { label: 'Alignement auto', icon: <Wand2 className="w-4 h-4" />, onClick: onClean },
  ];

  return (
    <div className="absolute top-4 left-4 z-10">
        <TooltipProvider>
            <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm p-1.5 rounded-lg border shadow-lg">
                {controls.map((control, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={control.onClick} disabled={control.disabled}>
                            {control.icon}
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{control.label}</p></TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    </div>
  );
};