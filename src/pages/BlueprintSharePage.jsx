import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { Loader2, AlertTriangle } from 'lucide-react';

import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';

import { getBlueprintPublic } from '@/lib/blueprints/blueprintApi';
import { blueprintNodeTypes, blueprintDefaultEdgeOptions } from '@/components/blueprints/BlueprintCanvas';

const ShareCanvas = ({ nodes, edges }) => (
  <div className="h-full w-full">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={blueprintNodeTypes}
      defaultEdgeOptions={blueprintDefaultEdgeOptions}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      translateExtent={[[-5000, -5000], [5000, 5000]]}
    >
      <Background variant="dots" gap={18} size={1.2} color="hsl(var(--muted-foreground) / 0.25)" />
    </ReactFlow>
  </div>
);

const BlueprintShareContent = () => {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await getBlueprintPublic(token);
        if (!mounted) return;
        if (!data) {
          setStatus('not-found');
          return;
        }
        const nodes = (data.nodes ?? []).map((node) => ({
          ...node,
          position: {
            x: Number(node.position_x ?? node.position?.x ?? 0),
            y: Number(node.position_y ?? node.position?.y ?? 0),
          },
          data: {
            ...node.data,
            title: node.title,
            family: node.family,
            subfamily: node.subfamily,
            fields: node.fields ?? {},
          },
          draggable: false,
          selectable: false,
        }));
        const root = nodes.find((node) => node.id === 'root');
        if (!root && data.blueprint) {
          nodes.unshift({
            id: 'root',
            type: 'rootNode',
            position: { x: 0, y: 0 },
            data: {
              title: data.blueprint.title,
              fields: data.blueprint.metadata?.fields ?? {},
            },
            draggable: false,
            selectable: false,
          });
        }
        const edges = (data.edges ?? []).map((edge) => ({
          ...edge,
          type: 'smoothstep',
          selectable: false,
        }));
        setPayload({
          blueprint: data.blueprint,
          nodes,
          edges,
        });
        setStatus('ready');
      } catch (error) {
        console.error(error);
        if (mounted) setStatus('error');
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Ce blueprint n'est plus disponible ou le lien est invalide.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Impossible de charger le blueprint partagé.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/70 bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.blueprint?.title ?? 'Blueprint partagé'}</p>
            <p className="text-xs text-muted-foreground">
              Consultation lecture seule • généré le {new Date(payload.blueprint?.updated_at ?? payload.blueprint?.created_at ?? Date.now()).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      </header>
      <main className="flex flex-1">
        <ShareCanvas nodes={payload.nodes} edges={payload.edges} />
      </main>
    </div>
  );
};

const BlueprintSharePage = () => (
  <ReactFlowProvider>
    <BlueprintShareContent />
  </ReactFlowProvider>
);

export default BlueprintSharePage;
