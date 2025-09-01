import React, { useState } from 'react';
import { Clock, GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditModuleDialog from './dialogs/EditModuleDialog';

export const ModuleItemDraggable = ({ module, family, hasPermission, onAddModuleToFlow }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `module-${module.id}`,
    data: { type: 'module', parent: module.subfamily_id },
    disabled: !hasPermission,
  });
  const { deleteModule, updateModule } = useBuilderCatalog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : 'auto',
  };

  const handleDragStart = (event) => {
    // Attache les données pour ReactFlow (Drop sur la grille)
    const dataForFlow = { moduleData: module, family: family };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(dataForFlow));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleUpdate = (updates) => {
    updateModule(module.id, updates);
    setIsEditing(false);
  };

  const confirmDelete = () => {
    deleteModule(module.id);
    setShowDeleteConfirm(false);
  };
  
  const handleClick = (e) => {
    // Si on clique sur un bouton du menu, on ne veut pas déclencher le onAddModuleToFlow
    if (e.target.closest('[data-radix-dropdown-menu-trigger]') || e.target.closest('dialog')) {
      return;
    }
    // Si on est en train de draguer pour réorganiser, on ne fait rien non plus
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Sinon, on ajoute le module au flow
    if (onAddModuleToFlow) {
      onAddModuleToFlow({ ...module }, family);
    }
  };


  const renderMenu = () => {
    if (!hasPermission) {
      return null;
    }
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-7 h-7"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <EditModuleDialog
          open={isEditing}
          onOpenChange={setIsEditing}
          onSave={handleUpdate}
          initialModule={module}
        />
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent onClick={e => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le module ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center group bg-background/30 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
      draggable={true}
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 cursor-grab"
        {...(hasPermission ? attributes : {})}
        {...(hasPermission ? listeners : {})}
        onClick={(e) => e.stopPropagation()} // Stop propagation to avoid adding to flow when dragging
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </Button>

      <div className="flex-grow ml-2">
        <p className="text-sm font-medium">{module.title}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>{module.duration} min</span>
        </div>
      </div>
      {renderMenu()}
    </div>
  );
};

export default ModuleItemDraggable;