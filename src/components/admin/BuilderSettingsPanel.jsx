import React from 'react';
    import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
    import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
    import { useBuilderCatalog } from '@/hooks/useBuilderCatalog';
    import { usePermissions } from '@/contexts/PermissionsContext';
    import { Button } from '@/components/ui/button';
    import { PlusCircle } from 'lucide-react';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import FamilyItem from './builder-settings/FamilyItem';

    export default function BuilderSettingsPanel() {
      const { catalog, handleDragEnd, addFamily } = useBuilderCatalog();
      const { hasPermission } = usePermissions();
      const canManage = hasPermission('builder:manage_catalog');

      const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
      );

      const handleAddFamily = () => {
        addFamily("Nouvelle famille");
      };

      return (
        <div className="p-6 bg-background text-foreground h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Gestion du Catalogue de Modules</h2>
            {canManage && (
              <Button onClick={handleAddFamily}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une famille
              </Button>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <ScrollArea className="flex-grow pr-4">
              <SortableContext items={catalog.map(f => `family-${f.id}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {catalog.map((family) => (
                    <FamilyItem key={family.id} family={family} hasPermission={canManage} />
                  ))}
                </div>
              </SortableContext>
            </ScrollArea>
          </DndContext>
        </div>
      );
    }