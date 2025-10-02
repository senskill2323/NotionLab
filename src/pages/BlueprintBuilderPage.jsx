import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

import BlueprintBuilderHeader from '@/components/blueprints/BlueprintBuilderHeader';
import BlueprintCanvas from '@/components/blueprints/BlueprintCanvas';
import BlueprintInspector from '@/components/blueprints/BlueprintInspector';
import BlueprintPalette, { getDefaultBlueprintPalette } from '@/components/blueprints/BlueprintPalette';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useBlueprintBuilder } from '@/hooks/useBlueprintBuilder';

const BlueprintBuilderShell = () => {
  const navigate = useNavigate();
  const { project } = useReactFlow();
  const flowWrapperRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [searchTerm, setSearchTerm] = useState('');

  const {
    state: {
      nodes,
      edges,
      blueprint,
      blueprints,
      isLoading,
      isSaving,
      autosaveState,
      selectedNode,
      selectedNodeId,
      canUndo,
      canRedo,
    },
    setters: {
      onNodesChange,
      onEdgesChange,
      onConnect,
      setSelectedNodeId,
    },
    actions: {
      addNodeFromPalette,
      updateNodeData,
      deleteNode,
      undo,
      redo,
      handleManualSave,
      handleDuplicateBlueprint,
      handleSnapshot,
      handleShare,
      handleTitleChange,
      createBlueprint,
    },
  } = useBlueprintBuilder();

  const paletteCatalog = useMemo(() => getDefaultBlueprintPalette(), []);

  const filteredBlueprints = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return blueprints;
    return blueprints.filter((item) => item.title?.toLowerCase().includes(term));
  }, [blueprints, searchTerm]);
  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDragEnd = (event) => {
    const { active } = event;
    if (!active?.data?.current?.item || !flowWrapperRef.current) return;

    const translated = active.rect.current?.translated ?? active.rect.current;
    if (!translated) return;

    const canvasBounds = flowWrapperRef.current.getBoundingClientRect();
    const centerX = translated.left + translated.width / 2;
    const centerY = translated.top + translated.height / 2;

    if (
      centerX < canvasBounds.left ||
      centerX > canvasBounds.right ||
      centerY < canvasBounds.top ||
      centerY > canvasBounds.bottom
    ) {
      return;
    }

    const position = project({
      x: centerX - canvasBounds.left,
      y: centerY - canvasBounds.top,
    });

    addNodeFromPalette(active.data.current.item, position);
  };

  const handleExportJson = () => {
    const payload = {
      blueprint,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(blueprint?.title ?? 'blueprint').replace(/\s+/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportImage = async (format) => {
    if (!flowWrapperRef.current) return;
    const target = flowWrapperRef.current.querySelector('.react-flow__viewport');
    if (!target) return;

    const { toPng, toSvg } = await import('html-to-image');
    const download = (dataUrl, extension) => {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `${(blueprint?.title ?? 'blueprint').replace(/\s+/g, '-')}.${extension}`;
      anchor.click();
    };

    if (format === 'png') {
      const dataUrl = await toPng(target, { pixelRatio: 2, backgroundColor: '#0f172a' });
      download(dataUrl, 'png');
    } else if (format === 'svg') {
      const dataUrl = await toSvg(target, { backgroundColor: '#0f172a' });
      download(dataUrl, 'svg');
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full w-full">
        <div className="flex w-72 flex-col border-r border-border/60 bg-muted/30">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Blueprints</p>
            <Button size="sm" variant="outline" onClick={() => createBlueprint()}>
              Nouveau
            </Button>
          </div>
          <ScrollArea className="h-40 border-b border-border/60 px-3 py-3">
            <div className="space-y-2">
              {filteredBlueprints.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === blueprint?.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (item.id !== blueprint?.id) {
                      navigate(`/blueprint-builder/${item.id}`);
                    }
                  }}
                >
                  {item.title}
                </Button>
              ))}

              {filteredBlueprints.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun blueprint trouvé.</p>
              )}
            </div>
          </ScrollArea>
          <BlueprintPalette searchTerm={searchTerm} onSearchChange={setSearchTerm} catalog={paletteCatalog} />
        </div>

        <div className="flex flex-1 flex-col">
          <BlueprintBuilderHeader
            blueprint={blueprint}
            autosaveState={autosaveState}
            isSaving={isSaving}
            canUndo={canUndo}
            canRedo={canRedo}
            onTitleChange={handleTitleChange}
            onSave={handleManualSave}
            onUndo={undo}
            onRedo={redo}
            onDuplicate={handleDuplicateBlueprint}
            onShare={handleShare}
            onSnapshot={handleSnapshot}
            onExportJson={handleExportJson}
            onExportPng={() => exportImage('png')}
            onExportSvg={() => exportImage('svg')}
          />
          <div className="flex flex-1">
            <BlueprintCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              setSelectedNodeId={setSelectedNodeId}
              flowWrapperRef={flowWrapperRef}
            />
            <BlueprintInspector
              node={selectedNode}
              onUpdate={updateNodeData}
              onDelete={deleteNode}
            />
          </div>
        </div>
      </div>
    </DndContext>
  );
};

const BlueprintBuilderPage = () => (
  <ReactFlowProvider>
    <BlueprintBuilderShell />
  </ReactFlowProvider>
);

export default BlueprintBuilderPage;












