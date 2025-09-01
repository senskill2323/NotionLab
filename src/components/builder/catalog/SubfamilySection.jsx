import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2, PlusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import EditSubfamilyDialog from '../dialogs/EditSubfamilyDialog';
import EditModuleDialog from '../dialogs/EditModuleDialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import ModuleItemDraggable from '../ModuleItemDraggable';
import ModuleItem from './ModuleItem'; // Keep both for now to see if we can merge
import { usePermissions } from '@/contexts/PermissionsContext';

const SubfamilySection = ({ subfamily, family, hasPermission, onAddModuleToFlow }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `subfamily-${subfamily.id}`,
    data: { type: 'subfamily', parent: family.id },
    disabled: !hasPermission
  });
  const { deleteSubfamily, updateSubfamilyName, addModule } = useBuilderCatalog();
  const { hasPermission: canManageCatalog } = usePermissions('builder:manage_catalog');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const confirmDelete = () => {
    deleteSubfamily(subfamily.id);
    setShowDeleteConfirm(false);
  };
  
  const handleUpdate = (name) => {
    if (name && name !== subfamily.name) {
      updateSubfamilyName(subfamily.id, name);
    }
    setIsEditing(false);
  };
  
  const handleAddModule = (moduleData) => {
    addModule(subfamily.id, moduleData);
    setIsAddingModule(false);
  };
  
  const renderMenu = () => {
    if (!hasPermission) {
      return null;
    }
    return (
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsAddingModule(true)}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajouter un module</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-7 h-7"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" />Renommer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg bg-card/60 p-2 border">
        <div className="flex items-center justify-between group -my-1">
          <div className="flex items-center gap-1 flex-grow">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-7 h-7 cursor-grab" {...(hasPermission ? attributes : {})} {...(hasPermission ? listeners : {})}>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Réorganiser la sous-famille</TooltipContent>
              </Tooltip>
            </TooltipProvider>
             <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-1 h-auto">
                {isOpen ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                <span className="font-medium text-sm">{subfamily.name}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          {renderMenu()}
        </div>

        <CollapsibleContent asChild>
          <div className="pl-4 pt-2 space-y-1">
            <SortableContext items={subfamily.modules.map(m => `module-${m.id}`)} strategy={verticalListSortingStrategy}>
              {subfamily.modules.map((module) => (
                 <ModuleItemDraggable
                    key={module.id}
                    module={module}
                    family={family}
                    hasPermission={canManageCatalog}
                    onAddModuleToFlow={onAddModuleToFlow}
                  />
              ))}
            </SortableContext>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {hasPermission && (
        <>
          <EditSubfamilyDialog
            open={isEditing}
            onOpenChange={setIsEditing}
            onSave={handleUpdate}
            initialName={subfamily.name}
          />
          <EditModuleDialog
            open={isAddingModule}
            onOpenChange={setIsAddingModule}
            onSave={handleAddModule}
          />
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la sous-famille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible et supprimera tous les modules associés.
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

export default SubfamilySection;