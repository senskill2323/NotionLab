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
import { AnimatePresence, motion } from 'framer-motion';

import SubfamilyItem from './SubfamilyItem';
import EditFamilyDialog from '../dialogs/EditFamilyDialog';
import EditSubfamilyDialog from '../dialogs/EditSubfamilyDialog';

const FamilyItem = ({ family, hasPermission }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `family-${family.id}`,
    data: { type: 'family' },
    disabled: !hasPermission
  });
  const { deleteFamily, addSubfamily } = useBuilderCatalog();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [isAddingSubfamily, setIsAddingSubfamily] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const confirmDelete = () => {
    deleteFamily(family.id);
    setShowDeleteConfirm(false);
  };
  
  const handleAddSubfamily = (name) => {
    addSubfamily(family.id, name);
    setIsAddingSubfamily(false);
  };

  return (
    <motion.div ref={setNodeRef} style={style} layout>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-background/50 rounded-lg border p-3">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2 flex-grow">
            {hasPermission && (
              <span {...attributes} {...listeners} className="cursor-grab p-1 -ml-2 text-muted-foreground hover:text-foreground">
                <GripVertical className="w-5 h-5" />
              </span>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-1 h-auto">
                {isOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                <span className="font-semibold text-base">{family.name}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          {hasPermission && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsEditingFamily(true)}><Pencil className="mr-2 h-4 w-4" />Renommer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddingSubfamily(true)}><PlusCircle className="mr-2 h-4 w-4" />Ajouter une sous-famille</DropdownMenuItem>
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
                className="pl-6 pt-2 space-y-2"
            >
                <AnimatePresence>
                  <SortableContext items={family.subfamilies.map(sf => `subfamily-${sf.id}`)} strategy={verticalListSortingStrategy}>
                    {family.subfamilies.map((subfamily) => (
                      <SubfamilyItem key={subfamily.id} subfamily={subfamily} familyId={family.id} hasPermission={hasPermission} />
                    ))}
                  </SortableContext>
                </AnimatePresence>
            </motion.div>
        </CollapsibleContent>
      </Collapsible>

      <EditFamilyDialog
        open={isEditingFamily}
        onOpenChange={setIsEditingFamily}
        family={family}
      />
      <EditSubfamilyDialog
        open={isAddingSubfamily}
        onOpenChange={setIsAddingSubfamily}
        onSave={handleAddSubfamily}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la famille "{family.name}" ?</AlertDialogTitle>
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
    </motion.div>
  );
};

export default FamilyItem;