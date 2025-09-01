import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2, Clock } from 'lucide-react';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditModuleDialog from '../dialogs/EditModuleDialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const ModuleItem = ({ module, subfamilyId, hasPermission }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `module-${module.id}`,
    data: { type: 'module', parent: subfamilyId },
    disabled: !hasPermission
  });
  const { deleteModule, updateModule } = useBuilderCatalog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const confirmDelete = () => {
    deleteModule(module.id);
    setShowDeleteConfirm(false);
  };

  const handleUpdate = (moduleData) => {
    updateModule(module.id, moduleData);
    setIsEditing(false);
  };

  const renderMenu = () => {
    if (!hasPermission) {
      return null;
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group bg-background/30 p-1.5 rounded-md">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-6 h-6 cursor-grab" {...(hasPermission ? attributes : {})} {...(hasPermission ? listeners : {})}>
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Réorganiser le module</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex-grow ml-2">
        <p className="text-sm font-medium">{module.title}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>{module.duration} min</span>
        </div>
      </div>
      {renderMenu()}
      
      {hasPermission && (
        <>
          <EditModuleDialog
            open={isEditing}
            onOpenChange={setIsEditing}
            onSave={handleUpdate}
            initialModule={module}
          />
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
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
      )}
    </div>
  );
};

export default ModuleItem;