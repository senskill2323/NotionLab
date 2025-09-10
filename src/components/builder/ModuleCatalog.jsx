import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
import { Loader2, PackageSearch, PlusCircle } from 'lucide-react';
import FamilyCard from '@/components/builder/catalog/FamilyCard';
import { DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import EditFamilyDialog from '@/components/builder/dialogs/EditFamilyDialog';
import { AnimatePresence, motion } from 'framer-motion';

export const ModuleCatalog = ({ onAddModuleToFlow }) => {
  const { catalog, loading, handleDragEnd, addFamily } = useBuilderCatalog();
  const { hasPermission } = usePermissions();
  const canManageCatalog = hasPermission('builder:manage_catalog');
  const [isAddingFamily, setIsAddingFamily] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAddFamily = (name) => {
    addFamily(name);
    setIsAddingFamily(false);
  };

  return (
    <div className="bg-card rounded-lg p-4 flex flex-col h-full shadow-lg">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold gradient-text">Catalogue de Modules</h2>
          {canManageCatalog && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setIsAddingFamily(true)}>
              <PlusCircle className="w-4 h-4 mr-1" />
              Ajouter une famille
            </Button>
          )}
        </div>
      </div>

      <EditFamilyDialog
        open={isAddingFamily}
        onOpenChange={setIsAddingFamily}
        onSave={handleAddFamily}
      />
      
      <ScrollArea className="flex-grow pr-3 -mr-3">
        {catalog.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
            <SortableContext items={catalog.map(f => `family-${f.id}`)} strategy={verticalListSortingStrategy}>
              <AnimatePresence>
                <motion.div layout className="space-y-4">
                  {catalog.map((family) => (
                     <motion.div
                      key={family.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <FamilyCard 
                        family={family} 
                        hasPermission={canManageCatalog}
                        onAddModuleToFlow={onAddModuleToFlow}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <PackageSearch className="mx-auto h-12 w-12 mb-4" />
            <p className="text-sm">Le catalogue est vide.</p>
            {canManageCatalog && (
              <Button variant="link" onClick={() => setIsAddingFamily(true)} className="mt-2">
                Commencer par créer une famille
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ModuleCatalog;