import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useReactFlow,
  ConnectionMode,
  Handle,
  Position,
} from 'reactflow';

import 'reactflow/dist/style.css';

import BlueprintEdge from '@/components/blueprints/BlueprintEdge';

const MindmapRootNode = ({ data, selected, isConnectable }) => (
  <div
    className={`relative rounded-lg border-2 ${selected ? 'border-primary' : 'border-primary/70'} bg-white/80 px-8 py-6 shadow-lg backdrop-blur`}
  >
    <p className="text-base font-semibold text-black">
      {data?.title ?? 'Noud central'}
    </p>
    {(data?.fields?.objectif || data?.fields?.contexte) && (
      <div className="mt-2 text-xs text-black/70">
        {data?.fields?.objectif && <p>Objectif : {data.fields.objectif}</p>}
        {data?.fields?.contexte && <p>Contexte : {data.fields.contexte}</p>}
      </div>
    )}
    <Handle
      id="center-target"
      type="target"
      position={Position.Top}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 16,
        height: 16,
        opacity: 0,
      }}
    />
    <Handle
      id="center-source"
      type="source"
      position={Position.Bottom}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 16,
        height: 16,
        opacity: 0,
      }}
    />
  </div>
);

const MindmapBubbleNode = ({ data, selected, isConnectable }) => (
  <div
    className={`relative max-w-[220px] rounded-md border ${selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/60'} bg-white/80 px-4 py-3 text-center shadow-sm transition-all`}
  >
    <p className="text-sm font-medium text-black">{data?.title ?? 'élément'}</p>
    {data?.family && (
      <p className="mt-1 text-[11px] uppercase tracking-wide text-black/70">
        {data.family}
        {data?.subfamily ? ` • ${data.subfamily}` : ''}
      </p>
    )}
    <Handle
      id="center-target"
      type="target"
      position={Position.Top}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 14,
        height: 14,
        opacity: 0,
      }}
    />
    <Handle
      id="center-source"
      type="source"
      position={Position.Bottom}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 14,
        height: 14,
        opacity: 0,
      }}
    />
  </div>
);

export const blueprintNodeTypes = {
  rootNode: MindmapRootNode,
  bubbleNode: MindmapBubbleNode,
};

export const blueprintDefaultEdgeOptions = {
  type: 'blueprintEdge',
  style: {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 1.5,
  },
};

const BlueprintCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onPaneClick,
  onNodeClick,
  setSelectedNodeId,
  flowWrapperRef,
}) => {
  const instance = useReactFlow();
  const edgeTypes = useMemo(() => ({ blueprintEdge: BlueprintEdge }), []);

  useEffect(() => {
    if (!instance || nodes.length === 0) return;
    instance.fitView({ padding: 0.2, duration: 200 });
  }, [instance, nodes]);

  return (
    <div ref={flowWrapperRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          setSelectedNodeId?.(node.id);
          onNodeClick?.(node);
        }}
        onPaneClick={() => {
          setSelectedNodeId?.(null);
          onPaneClick?.();
        }}
        nodeTypes={blueprintNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 300 }}
        connectionMode={ConnectionMode.Strict}
        defaultEdgeOptions={blueprintDefaultEdgeOptions}
        panOnScroll
        zoomOnScroll
        panOnDrag
        zoomOnPinch
        zoomOnDoubleClick={false}
        selectionOnDrag
        minZoom={0.3}
        maxZoom={1.6}
        className="bg-background touch-none"
      >
        <Background variant="dots" gap={18} size={1.2} color="hsl(var(--muted-foreground) / 0.25)" />
        <Controls className="bg-card/90" />
      </ReactFlow>
    </div>
  );
};

export default BlueprintCanvas;
