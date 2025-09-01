import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
    import { Helmet } from 'react-helmet';
    import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, KeyboardSensor, pointerWithin } from '@dnd-kit/core';
    import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
    import { Save, Loader2, AlertTriangle, Info } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useDebouncedCallback } from 'use-debounce';
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

    import { useDashboardLayout } from '@/hooks/useDashboardLayout';
    import { Module } from '@/components/dashboard/editor/Module';
    import { DroppableZone } from '@/components/dashboard/editor/DroppableZone';
    import { SortableRow } from '@/components/dashboard/editor/SortableRow';
    import { ModuleLibrary } from '@/components/dashboard/editor/ModuleLibrary';
    import LibraryModuleCard from '@/components/dashboard/editor/LibraryModuleCard';

    const DashboardEditorPage = () => {
      const { 
        layout, 
        setLayout, 
        loading, 
        error, 
        fetchData,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        activeItem,
        dropIndicatorInfo,
        forbiddenRowId,
      } = useDashboardLayout();

      const [saving, setSaving] = useState(false);
      const { toast } = useToast();
      const layoutRef = useRef(layout);
      const [allModules, setAllModules] = useState([]);

      useEffect(() => {
        const fetchAllModules = async () => {
          const { data } = await supabase.from('modules_registry').select('*');
          setAllModules(data || []);
        };
        fetchAllModules();
      }, []);

      useEffect(() => {
        layoutRef.current = layout;
      }, [layout]);

      const usedModuleKeys = useMemo(() => {
        if (!layout || !layout.rows) return [];
        return layout.rows.flatMap(row => row.columns.map(col => col.moduleKey));
      }, [layout]);

      const activeModuleData = useMemo(() => {
        if (!activeItem || !allModules.length) return null;
        const moduleKey = activeItem.moduleKey || activeItem.col?.moduleKey;
        return allModules.find(m => m.module_key === moduleKey);
      }, [activeItem, allModules]);

      const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        }),
        useSensor(TouchSensor, {
          activationConstraint: {
            delay: 250,
            tolerance: 5,
          },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
      );

      const performSave = useCallback(async (layoutToSave) => {
        setSaving(true);
        try {
          const { error } = await supabase.functions.invoke('update-dashboard-layout', {
            body: JSON.stringify({ owner_type: 'default', owner_id: null, layout_json: layoutToSave }),
          });
          if (error) throw error;
          toast({ title: "Mise en page sauvegardée" });
        } catch (error) {
          toast({ title: "Erreur de sauvegarde", description: error.message, variant: "destructive" });
        } finally {
          setSaving(false);
        }
      }, [toast]);

      const debouncedSave = useDebouncedCallback(async () => {
        const currentLayout = layoutRef.current;
        if (currentLayout) {
            await performSave(currentLayout);
        }
      }, 1500);

      useEffect(() => {
        fetchData();
      }, [fetchData]);

      useEffect(() => {
        if (layout && layout.rows.length > 0) {
          debouncedSave();
        }
      }, [layout, debouncedSave]);
      
      if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
      if (error) return <div className="flex flex-col items-center justify-center h-screen"><AlertTriangle className="h-8 w-8 text-destructive mb-2" /><p>{error}</p><Button onClick={fetchData} className="mt-4">Réessayer</Button></div>;
      
      return (
        <DndContext 
          sensors={sensors} 
          onDragStart={handleDragStart}
          onDragOver={(e) => handleDragOver(e, layoutRef)}
          onDragEnd={(e) => handleDragEnd(e, setLayout, dropIndicatorInfo)}
          collisionDetection={pointerWithin}
        >
          <TooltipProvider>
            <Helmet><title>Éditeur de Dashboard | Admin</title></Helmet>
            <div className="flex h-[calc(100vh-var(--header-height))]">
              <aside className="w-1/4 min-w-[300px] max-w-[400px] border-r bg-muted/20 h-full">
                <ModuleLibrary usedModuleKeys={usedModuleKeys} />
              </aside>
              <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-bold">Éditeur du Dashboard Client</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      Organisez les modules par glisser-déposer. La sauvegarde est automatique.
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Vos modifications sont enregistrées automatiquement 1.5s après votre dernière action.</p>
                        </TooltipContent>
                      </Tooltip>
                    </p>
                  </div>
                  <Button onClick={() => performSave(layoutRef.current)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sauvegarder maintenant
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg bg-background/50 min-h-[500px]">
                  <DroppableZone id="dropzone-before-first" />
                  {layout.rows.map((row) => (
                    <React.Fragment key={row.rowId}>
                      <SortableRow 
                          row={row} 
                          activeId={activeItem?.col?.colId} 
                          dropIndicatorInfo={dropIndicatorInfo} 
                          forbiddenRowId={forbiddenRowId} 
                      />
                      <DroppableZone id={`dropzone-after-${row.rowId}`} />
                    </React.Fragment>
                  ))}
                  {layout.rows.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>Commencez par glisser un module depuis la bibliothèque de gauche.</p>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </TooltipProvider>
          <DragOverlay dropAnimation={null}>
            {activeItem && activeModuleData ? (
              <div style={{ width: '300px' }}>
                {activeItem.type === 'library-module' ? (
                    <LibraryModuleCard module={activeModuleData} isDragging={true} />
                ) : (
                    <Module moduleKey={activeItem.col?.moduleKey} isOverlay={true} />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      );
    };

    export default DashboardEditorPage;