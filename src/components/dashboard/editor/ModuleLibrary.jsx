import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import LibraryModuleCard from './LibraryModuleCard';

const DraggableLibraryModule = ({ module }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${module.module_key}`,
    data: {
      type: 'library-module',
      moduleKey: module.module_key,
      defaultSpan: module.default_layout?.span || 12,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="relative touch-none mb-4">
      <LibraryModuleCard module={module} isDragging={isDragging} />
    </div>
  );
};

export const ModuleLibrary = ({ usedModuleKeys = [] }) => {
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Dropzone to accept modules dragged back from the layout
  const { isOver, setNodeRef } = useDroppable({ id: 'module-library-dropzone', data: { type: 'library-dropzone' } });

  useEffect(() => {
    const fetchModules = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('modules_registry')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error("Error fetching modules for library:", error);
        setError("Impossible de charger la bibliothèque de modules.");
      } else {
        setAllModules(data || []);
      }
      setLoading(false);
    };

    fetchModules();
  }, []);

  const availableModules = useMemo(() => {
    return allModules.filter(module => !usedModuleKeys.includes(module.module_key));
  }, [allModules, usedModuleKeys]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-destructive text-sm p-4"><AlertTriangle className="w-4 h-4 inline mr-2" />{error}</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Bibliothèque de Modules</CardTitle>
        <CardDescription>Glissez un module vers la droite pour l'ajouter au dashboard.</CardDescription>
      </CardHeader>
      {/* Drop here to remove a module from the dashboard */}
      <div
        ref={setNodeRef}
        className={`mx-4 mb-2 p-3 rounded border text-sm transition-colors ${
          isOver ? 'bg-primary/15 border-primary' : 'bg-muted/30 border-muted-foreground/40'
        }`}
      >
        Déposez un module ici pour le retirer du dashboard
      </div>
      <ScrollArea className="flex-grow p-4">
        {availableModules.length > 0 ? (
          availableModules.map(module => (
            <DraggableLibraryModule key={module.module_key} module={module} />
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4 flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            <span>Tous les modules sont utilisés.</span>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
