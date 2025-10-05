import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export const cloneNodes = (nodes = []) =>
  nodes.map((node) => ({
    ...node,
    position: { ...(node.position ?? {}) },
    data: {
      ...(node.data ?? {}),
      fields: { ...(node.data?.fields ?? {}) },
      metadata: { ...(node.data?.metadata ?? {}) },
    },
  }));

const cloneEdge = (edge = {}) => ({
  ...edge,
  data: edge?.data
    ? {
        ...edge.data,
        metadata: { ...(edge.data?.metadata ?? {}) },
      }
    : undefined,
});

export const sanitizeBlueprintGraph = ({ nodes = [], edges = [] } = {}) => {
  const nodeIdMap = new Map();
  let nodeIdRegeneratedCount = 0;

  const sanitizedNodes = nodes.map((node) => {
    const cloned = {
      ...node,
      position: { ...(node.position ?? {}) },
      data: {
        ...(node.data ?? {}),
        fields: { ...(node.data?.fields ?? {}) },
        metadata: { ...(node.data?.metadata ?? {}) },
      },
    };

    const nodeId = node?.id;
    const hasValidId = typeof nodeId === 'string' && uuidValidate(nodeId);
    if (!hasValidId) {
      const nextId = uuidv4();
      if (nodeId) {
        nodeIdMap.set(nodeId, nextId);
      }
      cloned.id = nextId;
      nodeIdRegeneratedCount += 1;
    }

    return cloned;
  });

  const nodeIdSet = new Set(sanitizedNodes.map((node) => node.id));
  let edgeIdRegeneratedCount = 0;
  const orphanEdges = [];
  let edgesChanged = false;

  const sanitizedEdges = edges.reduce((acc, edge) => {
    const cloned = cloneEdge(edge);
    const originalSource = cloned.source;
    const originalTarget = cloned.target;

    const mappedSource = nodeIdMap.get(originalSource) ?? originalSource;
    const mappedTarget = nodeIdMap.get(originalTarget) ?? originalTarget;

    if (mappedSource !== originalSource || mappedTarget !== originalTarget) {
      cloned.source = mappedSource;
      cloned.target = mappedTarget;
      edgesChanged = true;
    }

    const edgeId = cloned?.id;
    const hasValidEdgeId = typeof edgeId === 'string' && uuidValidate(edgeId);
    if (!hasValidEdgeId) {
      cloned.id = uuidv4();
      edgeIdRegeneratedCount += 1;
      edgesChanged = true;
    }

    if (!nodeIdSet.has(cloned.source) || !nodeIdSet.has(cloned.target)) {
      orphanEdges.push(cloned);
      edgesChanged = true;
      return acc;
    }

    acc.push(cloned);
    return acc;
  }, []);

  const stats = {
    nodeIdRegeneratedCount,
    edgeIdRegeneratedCount,
    prunedEdges: orphanEdges,
  };

  return {
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    nodeIdMap,
    stats,
    nodesChanged: nodeIdRegeneratedCount > 0,
    edgesChanged: edgesChanged || orphanEdges.length > 0,
  };
};
