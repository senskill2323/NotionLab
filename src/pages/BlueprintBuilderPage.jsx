import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

import BlueprintBuilderHeader from '@/components/blueprints/BlueprintBuilderHeader';
import BlueprintCanvas from '@/components/blueprints/BlueprintCanvas';
import BlueprintInspector from '@/components/blueprints/BlueprintInspector';
import BlueprintPalette, { getDefaultBlueprintPalette } from '@/components/blueprints/BlueprintPalette';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useBlueprintBuilder } from '@/hooks/useBlueprintBuilder';

import { emitBlueprintAutosaveTelemetry } from '@/lib/blueprints/telemetry';

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
      lastSavedAt,
      selectedNode,
      selectedNodeId,
      canUndo,
      canRedo,
      palette,
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
      handleDeleteBlueprint,
      handleDuplicateBlueprint,
      handleSnapshot,
      handleShare,
      handleTitleChange,
      createBlueprint,
    },
  } = useBlueprintBuilder();

  const paletteCatalog = useMemo(() => {
    return palette?.length ? palette : getDefaultBlueprintPalette();
  }, [palette]);

  const filteredBlueprints = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return blueprints;
    return blueprints.filter((item) => item.title?.toLowerCase().includes(term));
  }, [blueprints, searchTerm]);
  const selectedBlueprintId = blueprint?.id ?? '';
  const isCurrentBlueprintVisible = filteredBlueprints.some((item) => item.id === selectedBlueprintId);
  const selectValue = isCurrentBlueprintVisible ? selectedBlueprintId : '';

  const handleSelectBlueprint = (value) => {
    if (!value || value === blueprint?.id) {
      return;
    }
    navigate(`/blueprint-builder/${value}`);
  };
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center overflow-hidden">
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

  const handleExportJson = async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const payload = {
      blueprint,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const payloadString = JSON.stringify(payload, null, 2);
    const durationNow = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return Math.round(now - startedAt);
    };

    try {
      const blob = new Blob([payloadString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${(blueprint?.title ?? 'blueprint').replace(/\s+/g, '-')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      emitBlueprintAutosaveTelemetry('export', {
        format: 'json',
        duration_ms: durationNow(),
        node_count: nodes.length,
        edge_count: edges.length,
      });
    } catch (error) {
      console.error('Export JSON failed', error);
      emitBlueprintAutosaveTelemetry('export_failed', {
        format: 'json',
        duration_ms: durationNow(),
        node_count: nodes.length,
        edge_count: edges.length,
        error_message: error?.message ?? null,
      });
    }
  };

  const exportImage = async (format) => {
    if (!flowWrapperRef.current) return;
    const target = flowWrapperRef.current.querySelector('.react-flow__viewport');
    if (!target) return;

    const { toPng, toSvg } = await import('html-to-image');
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationNow = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return Math.round(now - startedAt);
    };

    const download = (dataUrl, extension) => {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `${(blueprint?.title ?? 'blueprint').replace(/\s+/g, '-')}.${extension}`;
      anchor.click();
    };

    try {
      if (format === 'png') {
        const dataUrl = await toPng(target, { pixelRatio: 2, backgroundColor: '#0f172a' });
        download(dataUrl, 'png');
      } else if (format === 'svg') {
        const dataUrl = await toSvg(target, { backgroundColor: '#0f172a' });
        download(dataUrl, 'svg');
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }

      emitBlueprintAutosaveTelemetry('export', {
        format,
        duration_ms: durationNow(),
        node_count: nodes.length,
        edge_count: edges.length,
      });
    } catch (error) {
      console.error('Export image failed', { format, error });
      emitBlueprintAutosaveTelemetry('export_failed', {
        format,
        duration_ms: durationNow(),
        node_count: nodes.length,
        edge_count: edges.length,
        error_message: error?.message ?? null,
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="flex w-72 flex-col border-r border-border/60 bg-muted/30">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 px-2"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => createBlueprint()}>
              Nouveau
            </Button>
          </div>
          <div className="border-b border-border/60 px-4 py-3">
            <Select value={selectValue} onValueChange={handleSelectBlueprint}>
              <SelectTrigger className="h-9 w-full justify-between">
                <SelectValue
                  placeholder={
                    filteredBlueprints.length ? 'Sélectionner un blueprint' : 'Aucun blueprint disponible'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredBlueprints.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
                {filteredBlueprints.length === 0 && (
                  <SelectItem value="__empty" disabled>
                    Aucun blueprint trouvé.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <BlueprintPalette searchTerm={searchTerm} onSearchChange={setSearchTerm} catalog={paletteCatalog} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <BlueprintBuilderHeader
            blueprint={blueprint}
            autosaveState={autosaveState}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            canUndo={canUndo}
            canRedo={canRedo}
            onTitleChange={handleTitleChange}
            onSave={handleManualSave}
            onUndo={undo}
            onRedo={redo}
            onDuplicate={handleDuplicateBlueprint}
            onDelete={handleDeleteBlueprint}
            onShare={handleShare}
            onSnapshot={handleSnapshot}
            onExportJson={handleExportJson}
            onExportPng={() => exportImage('png')}
            onExportSvg={() => exportImage('svg')}
          />
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1">
              <BlueprintCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                setSelectedNodeId={setSelectedNodeId}
                flowWrapperRef={flowWrapperRef}
              />
            </div>
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




