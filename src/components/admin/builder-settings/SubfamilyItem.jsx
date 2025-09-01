import React, { useState } from 'react';
    import { useSortable } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
    import { Button } from '@/components/ui/button';
    import { GripVertical, PlusCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
    import { Input } from '@/components/ui/input';
    import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
    import ModuleItem from './ModuleItem';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
    import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

    const SubfamilyItem = ({ subfamily, hasPermission }) => {
      const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `subfamily-${subfamily.id}`, disabled: !hasPermission });
      const { updateSubfamilyName, deleteSubfamily, addModule } = useBuilderCatalog();
      const [isEditing, setIsEditing] = useState(false);
      const [newModuleName, setNewModuleName] = useState('');
      const [isAddingModule, setIsAddingModule] = useState(false);
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      };

      const handleUpdateName = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
          updateSubfamilyName(subfamily.id, e.target.value);
          setIsEditing(false);
        }
      };

      const handleAddModule = () => {
        if (newModuleName.trim() !== '') {
          addModule(subfamily.id, { title: newModuleName.trim(), duration: 15 });
          setNewModuleName('');
          setIsAddingModule(false);
        }
      };

      const confirmDelete = () => {
        deleteSubfamily(subfamily.id);
        setShowDeleteConfirm(false);
      };

      return (
        <div ref={setNodeRef} style={style} className="bg-background/50 border rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-grow">
              {hasPermission && <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical /></div>}
              {isEditing ? (
                <Input
                  defaultValue={subfamily.name}
                  onKeyDown={handleUpdateName}
                  onBlur={handleUpdateName}
                  autoFocus
                  className="font-medium"
                  readOnly={!hasPermission}
                />
              ) : (
                <h4 className="font-medium">{subfamily.name}</h4>
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
          <Accordion type="multiple" className="w-full mt-2">
            <AccordionItem value="modules" className="border-none">
              <AccordionTrigger className="text-xs">Modules ({subfamily.modules.length})</AccordionTrigger>
              <AccordionContent>
                <SortableContext items={subfamily.modules.map(m => `module-${m.id}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 pl-4">
                    {subfamily.modules.map((module) => (
                      <ModuleItem key={module.id} module={module} hasPermission={hasPermission} />
                    ))}
                    {isAddingModule && hasPermission && (
                        <div className="flex gap-2">
                        <Input
                            placeholder="Nom du module"
                            value={newModuleName}
                            onChange={(e) => setNewModuleName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                        />
                        <Button onClick={handleAddModule}>Ajouter</Button>
                        <Button variant="ghost" onClick={() => setIsAddingModule(false)}>Annuler</Button>
                        </div>
                    )}
                    </div>
                </SortableContext>
                {hasPermission && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setIsAddingModule(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un module
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <AlertDialog open={showDeleteConfirm} on8penChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette sous-famille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Tous les modules associés seront également supprimés.
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
    export default SubfamilyItem;