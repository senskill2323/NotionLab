import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2, PlusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import ModuleItem from './ModuleItem';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from 'framer-motion';

import EditSubfamilyDialog from '../dialogs/EditSubfamilyDialog';
import EditModuleDialog from '../dialogs/EditModuleDialog';

const SubfamilyItem = ({ subfamily, familyId, hasPermission }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `subfamily-${subfamily.id}`,
    data: { type: 'subfamily', parent: familyId },
    disabled: !hasPermission
  });
  const { deleteSubfamily, addModule } = useBuilderCatalog();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingSubfamily, setIsEditingSubfamily] = useState(false);
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
  
  const handleAddModule = (moduleData) => {
    addModule(subfamily.id, moduleData);
    setIsAddingModule(false);
  };

  return (
    <motion.div ref={setNodeRef} style={style} layout>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg bg-background/80 p-2">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-1 flex-grow">
            {hasPermission && (
              <span {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                <GripVertical className="w-4 h-4" />
              </span>
            )}
             <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-1 h-auto">
                {isOpen ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                <span className="font-medium text-sm">{subfamily.name}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          {hasPermission && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100"><MoreVertical className="h-3 w-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsEditingSubfamily(true)}><Pencil className="mr-2 h-4 w-4" />Renommer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddingModule(true)}><PlusCircle className="mr-2 h-4 w-4" />Ajouter un module</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent asChild>
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-4 pt-2 space-y-1"
          >
            <AnimatePresence>
              <SortableContext items={subfamily.modules.map(m => `module-${m.id}`)} strategy={verticalListSortingStrategy}>
                {subfamily.modules.map((module) => (
                  <ModuleItem key={module.id} module={module} subfamilyId={subfamily.id} hasPermission={hasPermission} />
                ))}
              </SortableContext>
            </AnimatePresence>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
      
      <EditSubfamilyDialog
        open={isEditingSubfamily}
        onOpenChange={setIsEditingSubfamily}
        subfamily={subfamily}
      />
      <EditModuleDialog
        open={isAddingModule}
        onOpenChange={setIsAddingModule}
        onSave={handleAddModule}
      />
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la sous-famille "{subfamily.name}" ?</AlertDialogTitle>
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
    </motion.div>
  );
};

export default SubfamilyItem;