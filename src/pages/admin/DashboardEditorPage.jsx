import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  pointerWithin,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Save, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebouncedCallback } from 'use-debounce';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { Module } from '@/components/dashboard/editor/Module';
import { DroppableZone } from '@/components/dashboard/editor/DroppableZone';
import { SortableRow } from '@/components/dashboard/editor/SortableRow';
import { ModuleLibrary } from '@/components/dashboard/editor/ModuleLibrary';
import LibraryModuleCard from '@/components/dashboard/editor/LibraryModuleCard';

const DashboardEditorPage = () => {
  const {
    layout,
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
  const [allModules, setAllModules] = useState([]);
  const skipNextAutoSaveRef = useRef(false);

  useEffect(() => {
    const fetchAllModules = async () => {
      const { data } = await supabase.from('modules_registry').select('*');
      setAllModules(data || []);
    };

    fetchAllModules();
  }, []);

  const usedModuleKeys = useMemo(() => {
    if (!layout || !Array.isArray(layout.rows)) {
      return [];
    }
    return layout.rows.flatMap((row) => row.columns.map((col) => col.moduleKey));
  }, [layout]);

  const activeModuleData = useMemo(() => {
    if (!activeItem || allModules.length === 0) {
      return null;
    }
    const moduleKey = activeItem.moduleKey || activeItem.col?.moduleKey;
    return allModules.find((module) => module.module_key === moduleKey) || null;
  }, [activeItem, allModules]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const performSave = useCallback(
    async (layoutToSave) => {
      setSaving(true);
      try {
        const layoutPayload = layoutToSave ?? { rows: [] };
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const invokeOptions = {
          body: { owner_type: 'default', owner_id: null, layout_json: layoutPayload },
        };

        if (session?.access_token) {
          invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
        }

        const { error } = await supabase.functions.invoke('update-dashboard-layout', invokeOptions);
        if (error) throw error;
        toast({ title: 'Mise en page sauvegardée' });
      } catch (saveError) {
        const description = saveError instanceof Error ? saveError.message : String(saveError);
        toast({ title: 'Erreur de sauvegarde', description, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    },
    [toast],
  );

  const debouncedSave = useDebouncedCallback(async (nextLayout) => {
    await performSave(nextLayout);
  }, 1500);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const layoutPayload = layout ?? { rows: [] };
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    debouncedSave(layoutPayload);
  }, [layout, loading, debouncedSave]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <AlertTriangle className="mb-2 h-8 w-8 text-destructive" />
        <p>{error}</p>
        <Button onClick={fetchData} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(event) => {
        const result = handleDragEnd(event);
        if (result?.type === 'library-drop' && result.layout) {
          if (typeof debouncedSave.cancel === 'function') {
            debouncedSave.cancel();
          }
          skipNextAutoSaveRef.current = true;
          performSave(result.layout);
        }
      }}
      collisionDetection={pointerWithin}
    >
      <TooltipProvider>
        <Helmet>
          <title>Éditeur de Dashboard | Admin</title>
        </Helmet>

        <div className="flex h-[calc(100vh-var(--header-height))]">
          <aside className="h-full w-1/4 min-w-[300px] max-w-[400px] border-r bg-muted/20">
            <ModuleLibrary usedModuleKeys={usedModuleKeys} />
          </aside>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Éditeur du Dashboard Client</h1>
                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                  Organisez les modules par glisser-déposer. La sauvegarde est automatique.
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vos modifications sont enregistrées automatiquement 1,5 s après votre dernière action.</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
              </div>
              <Button onClick={() => performSave(layout)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Sauvegarder maintenant
              </Button>
            </div>

            <div className="min-h-[500px] rounded-lg border bg-background/50 p-4">
              <DroppableZone id="dropzone-before-first" />
              {(layout?.rows ?? []).map((row) => (
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
              {(layout?.rows?.length ?? 0) === 0 && (
                <div className="py-16 text-center text-muted-foreground">
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
              <LibraryModuleCard module={activeModuleData} isDragging />
            ) : (
              <Module moduleKey={activeItem.col?.moduleKey} isOverlay />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DashboardEditorPage;
