import React, { useState } from 'react';
    import { useSortable } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
    import { Button } from '@/components/ui/button';
    import { GripVertical, PlusCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
    import { Input } from '@/components/ui/input';
    import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
    import SubfamilyItem from './SubfamilyItem';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
    import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

    const FamilyItem = ({ family, hasPermission }) => {
      const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `family-${family.id}`, disabled: !hasPermission });
      const { updateFamilyName, deleteFamily, addSubfamily } = useBuilderCatalog();
      const [isEditing, setIsEditing] = useState(false);
      const [newSubfamilyName, setNewSubfamilyName] = useState('');
      const [isAddingSubfamily, setIsAddingSubfamily] = useState(false);
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      };

      const handleUpdateName = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
          updateFamilyName(family.id, e.target.value);
          setIsEditing(false);
        }
      };

      const handleAddSubfamily = () => {
        if (newSubfamilyName.trim() !== '') {
          addSubfamily(family.id, newSubfamilyName.trim());
          setNewSubfamilyName('');
          setIsAddingSubfamily(false);
        }
      };
      
      const confirmDelete = () => {
        deleteFamily(family.id);
        setShowDeleteConfirm(false);
      };

      return (
        <div ref={setNodeRef} style={style} className="bg-card/80 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-grow">
              {hasPermission && <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical /></div>}
              {isEditing ? (
                <Input
                  defaultValue={family.name}
                  onKeyDown={handleUpdateName}
                  onBlur={handleUpdateName}
                  autoFocus
                  className="text-lg font-semibold"
                  readOnly={!hasPermission}
                />
              ) : (
                <h3 className="text-lg font-semibold">{family.name}</h3>
              )}
            </div>
            {hasPermission && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="subfamilies" className="border-none">
              <AccordionTrigger className="text-sm">Sous-familles ({family.subfamilies.length})</AccordionTrigger>
              <AccordionContent>
                <SortableContext items={family.subfamilies.map(sf => `subfamily-${sf.id}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 pl-4">
                    {family.subfamilies.map((subfamily) => (
                      <SubfamilyItem key={subfamily.id} subfamily={subfamily} hasPermission={hasPermission} />
                    ))}
                    {isAddingSubfamily && hasPermission && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nom de la sous-famille"
                          value={newSubfamilyName}
                          onChange={(e) => setNewSubfamilyName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSubfamily()}
                        />
                        <Button onClick={handleAddSubfamily}>Ajouter</Button>
                        <Button variant="ghost" onClick={() => setIsAddingSubfamily(false)}>Annuler</Button>
                      </div>
                    )}
                  </div>
                </SortableContext>
                {hasPermission && (
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setIsAddingSubfamily(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter une sous-famille
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette famille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes les sous-familles et modules associés seront également supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    };
    export default FamilyItem;