import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, PlusCircle, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import SubfamilySection from './SubfamilySection';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import EditFamilyDialog from '../dialogs/EditFamilyDialog';
import EditSubfamilyDialog from '../dialogs/EditSubfamilyDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const FamilyCard = ({ family, hasPermission, onAddModuleToFlow }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `family-${family.id}`,
    data: { type: 'family' },
    disabled: !hasPermission
  });
  const { deleteFamily, updateFamilyName, addSubfamily } = useBuilderCatalog();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSubfamily, setIsAddingSubfamily] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleUpdate = (name) => {
    if (name && name !== family.name) {
      updateFamilyName(family.id, name);
    }
    setIsEditing(false);
  };
  
  const handleAddSubfamily = (name) => {
    addSubfamily(family.id, name);
    setIsAddingSubfamily(false);
  };

  const confirmDelete = () => {
    deleteFamily(family.id);
    setShowDeleteConfirm(false);
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
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsAddingSubfamily(true)}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une sous-famille</TooltipContent>
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
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="bg-background/50 overflow-hidden border-border/60">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="flex flex-row items-center justify-between p-2 bg-muted/30 border-b">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7 cursor-grab" {...(hasPermission ? attributes : {})} {...(hasPermission ? listeners : {})}>
                      <GripVertical className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Réorganiser la famille</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 p-1 h-auto text-base font-semibold">
                   {isOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                   {family.name}
                </Button>
              </CollapsibleTrigger>
            </div>
            {renderMenu()}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-2 space-y-2">
                <SortableContext items={family.subfamilies.map(sf => `subfamily-${sf.id}`)} strategy={verticalListSortingStrategy}>
                  {family.subfamilies.map((subfamily) => (
                    <SubfamilySection 
                      key={subfamily.id} 
                      subfamily={subfamily} 
                      family={family}
                      hasPermission={hasPermission} 
                      onAddModuleToFlow={onAddModuleToFlow}
                    />
                  ))}
                </SortableContext>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      {hasPermission && (
        <>
          <EditFamilyDialog
            open={isEditing}
            onOpenChange={setIsEditing}
            onSave={handleUpdate}
            initialName={family.name}
          />
          <EditSubfamilyDialog
            open={isAddingSubfamily}
            onOpenChange={setIsAddingSubfamily}
            onSave={handleAddSubfamily}
          />
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la famille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible et supprimera toutes les sous-familles et modules associés.
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

export default FamilyCard;