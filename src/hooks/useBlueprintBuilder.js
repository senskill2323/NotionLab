import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultBlueprintPalette } from '@/components/blueprints/BlueprintPalette';

import { useToast } from '@/components/ui/use-toast';
import {
  listBlueprints,
  getBlueprintById,
  upsertBlueprintGraph,
  deleteBlueprint,
  duplicateBlueprint,
  createBlueprintSnapshot,
  createBlueprintShare,
  renameBlueprint,
  fetchBlueprintPalette,
} from '@/lib/blueprints/blueprintApi';

const ROOT_ELEMENT_KEY = 'root';

const createInitialNodes = (title = 'Projet sans titre') => {
  const rootId = uuidv4();
  return [
    {
      id: rootId,
      type: 'rootNode',
      position: { x: 0, y: 0 },
      data: {
        title,
        elementKey: ROOT_ELEMENT_KEY,
        family: null,
        subfamily: null,
        radius: 180,
        fields: {
          objectif: '',
          contexte: '',
        },
        metadata: { locked: true },
      },
      draggable: false,
      selectable: true,
    },
  ];
};

const findRootNodeId = (nodes) =>
  nodes?.find((node) => node?.data?.elementKey === ROOT_ELEMENT_KEY)?.id ?? nodes?.[0]?.id ?? null;

const cloneNodes = (nodes) =>
  nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      fields: { ...(node.data?.fields ?? {}) },
      metadata: { ...(node.data?.metadata ?? {}) },
    },
  }));

export const useBlueprintBuilder = () => {
  const { blueprintId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialNodesRef = useRef(createInitialNodes());
  const nodesRef = useRef(initialNodesRef.current);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodesRef.current);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [hasFetchedInitialList, setHasFetchedInitialList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const initialRootId = findRootNodeId(initialNodesRef.current);
  const [selectedNodeId, setSelectedNodeId] = useState(initialRootId);
  const [palette, setPalette] = useState(() => getDefaultBlueprintPalette());

  const blueprintRef = useRef(null);
  const rootNodeIdRef = useRef(initialRootId);
  const isHydratingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const historyRef = useRef([{ nodes: cloneNodes(initialNodesRef.current), edges: [] }]);
  const historyIndexRef = useRef(0);
  const applyingHistoryRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);
  const autosaveRetryTimerRef = useRef(null);
  const autosaveErrorToastShownRef = useRef(false);

  const recordHistory = useCallback((nextNodes, nextEdges) => {
    if (applyingHistoryRef.current || isHydratingRef.current) return;
    const snapshot = {
      nodes: cloneNodes(nextNodes),
      edges: nextEdges.map((edge) => ({ ...edge })),
    };
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(snapshot);
    historyRef.current = stack.slice(-50);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const fetchBlueprints = useCallback(async () => {
    try {
      const data = await listBlueprints();
      setBlueprints(data ?? []);
      return data ?? [];
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste des blueprints.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setHasFetchedInitialList(true);
    }
  }, [toast]);

  const debouncedRename = useDebouncedCallback(async (id, title) => {
    try {
      await renameBlueprint(id, title);
      await fetchBlueprints();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur de renommage',
        description: 'Impossible de renommer le blueprint.',
        variant: 'destructive',
      });
    }
  }, 600);

  const persistGraph = useCallback(
    async ({ autosave = true } = {}) => {
      if (!blueprintRef.current) return null;
      const payloadNodes = cloneNodes(nodes);
      const payloadEdges = edges.map((edge) => ({ ...edge }));

      try {
        if (!autosave) setIsSaving(true);
        setAutosaveState(autosave ? 'saving' : 'idle');
        const savedId = await upsertBlueprintGraph({
          blueprintId: blueprintRef.current.id ?? null,
          title: blueprintRef.current.title,
          description: blueprintRef.current.description ?? null,
          status: blueprintRef.current.status ?? 'draft',
          metadata: blueprintRef.current.metadata ?? {},
          nodes: payloadNodes,
          edges: payloadEdges,
          autosave,
        });

        if (!blueprintRef.current.id && savedId) {
          blueprintRef.current = { ...blueprintRef.current, id: savedId };
          setBlueprint((prev) => (prev ? { ...prev, id: savedId } : prev));
          navigate(`/blueprint-builder/${savedId}`, { replace: true });
        }

        setAutosaveState('idle');
        setLastSavedAt(new Date());
        hasUnsavedChangesRef.current = false;
        return blueprintRef.current?.id ?? savedId;
      } catch (error) {
        console.error(error);
        setAutosaveState('error');
        if (!autosave) {
          toast({
            title: 'Erreur de sauvegarde',
            description: "Impossible d'enregistrer le blueprint.",
            variant: 'destructive',
          });
        }
        throw error;
      } finally {
        if (!autosave) setIsSaving(false);
      }
    },
    [edges, navigate, nodes, toast],
  );

  const debouncedAutosave = useDebouncedCallback(async () => {
    if (!blueprintRef.current?.id) return;
    if (!hasUnsavedChangesRef.current) return;
    try {
      await persistGraph({ autosave: true });
    } catch (error) {
      console.error('Autosave failed', error);
    }
  }, 1200);

  useEffect(() => {
    if (autosaveState === 'error') {
      if (!autosaveErrorToastShownRef.current) {
        toast({
          title: 'Sauvegarde automatique en échec',
          description: 'Nouvelle tentative dans 5 secondes…',
        });
        autosaveErrorToastShownRef.current = true;
      }

      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }

      if (hasUnsavedChangesRef.current) {
        autosaveRetryTimerRef.current = setTimeout(() => {
          if (hasUnsavedChangesRef.current) {
            persistGraph({ autosave: true }).catch((e) => {
              console.error('Autosave retry failed', e);
            });
          }
        }, 5000);
      }
    } else {
      autosaveErrorToastShownRef.current = false;
      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }
    }

    return () => {
      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }
    };
  }, [autosaveState, persistGraph, toast]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current || isHydratingRef.current) return;
    hasUnsavedChangesRef.current = true;
    recordHistory(nodes, edges);
    debouncedAutosave();
  }, [nodes, edges, debouncedAutosave, recordHistory]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const hydrateFromPayload = useCallback(
    (payload, { focus = true } = {}) => {
      isHydratingRef.current = true;
      const nextBlueprint = payload?.blueprint ?? null;
      const nodesFromPayload = payload?.nodes?.length
        ? payload.nodes
        : createInitialNodes(nextBlueprint?.title ?? 'Blueprint');
      const edgesFromPayload = payload?.edges?.length ? payload.edges : [];

      setBlueprint(nextBlueprint);
      blueprintRef.current = nextBlueprint ?? null;
      setLastSavedAt(nextBlueprint?.updated_at ? new Date(nextBlueprint.updated_at) : null);

      setNodes(() => nodesFromPayload);
      setEdges(() => edgesFromPayload);

      const rootId = findRootNodeId(nodesFromPayload);
      rootNodeIdRef.current = rootId;
      setSelectedNodeId(rootId);

      historyRef.current = [
        { nodes: cloneNodes(nodesFromPayload), edges: edgesFromPayload.map((edge) => ({ ...edge })) },
      ];
      historyIndexRef.current = 0;
      hasUnsavedChangesRef.current = false;
      hasLoadedOnceRef.current = true;

      window.requestAnimationFrame(() => {
        isHydratingRef.current = false;
        if (focus && rootId) {
          setNodes((current) =>
            current.map((node) => ({ ...node, selected: node.id === rootId })),
          );
        }
      });
    },
    [setEdges, setNodes],
  );

  const loadBlueprint = useCallback(
    async (id) => {
      if (!id || id === 'new') return;
      setIsLoading(true);
      try {
        const payload = await getBlueprintById(id);
        if (!payload) {
          toast({
            title: 'Blueprint introuvable',
            description: 'Le blueprint demandé est introuvable.',
            variant: 'destructive',
          });
          navigate('/blueprint-builder', { replace: true });
          return;
        }
        hydrateFromPayload(payload);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le blueprint.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateFromPayload, navigate, toast],
  );

  const createBlueprint = useCallback(
    async (title = 'Nouveau blueprint') => {
      const seedNodes = createInitialNodes(title);
      setIsLoading(true);
      try {
        const newId = await upsertBlueprintGraph({
          blueprintId: null,
          title,
          metadata: { projectTitle: title },
          status: 'draft',
          nodes: seedNodes,
          edges: [],
          autosave: false,
        });
        await fetchBlueprints();
        navigate(`/blueprint-builder/${newId}`, { replace: true });
        return newId;
      } catch (error) {
        console.error(error);
        toast({
          title: 'Erreur',
          description: 'Impossible de créer un nouveau blueprint.',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchBlueprints, navigate, toast],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPalette = async () => {
      try {
        const data = await fetchBlueprintPalette();
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setPalette(data);
        } else {
          setPalette(getDefaultBlueprintPalette());
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setPalette(getDefaultBlueprintPalette());
        }
      }
    };

    loadPalette();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  useEffect(() => {
    if (!hasFetchedInitialList) return;

    if (!blueprintId) {
      if (blueprints.length > 0) {
        navigate(`/blueprint-builder/${blueprints[0]?.id ?? ''}`, { replace: true });
      } else {
        createBlueprint();
      }
      return;
    }

    if (blueprintId === 'new') {
      createBlueprint();
      return;
    }

    loadBlueprint(blueprintId);
  }, [blueprintId, blueprints.length, createBlueprint, hasFetchedInitialList, loadBlueprint, navigate]);

  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [setEdges],
  );

  const addNodeFromPalette = useCallback(
    (item, position, parentId) => {
      const targetParent =
        parentId || selectedNodeId || rootNodeIdRef.current || findRootNodeId(nodesRef.current);
      const nodeId = uuidv4();
      const newNode = {
        id: nodeId,
        type: 'bubbleNode',
        position,
        data: {
          title: item.label,
          family: item.family,
          subfamily: item.subfamily,
          elementKey: item.elementKey,
          radius: item.radius ?? 120,
          fields: item.fields ? { ...item.fields } : {},
          metadata: { paletteId: item.id },
        },
      };

      setNodes((nds) => [
        ...nds.map((node) => ({ ...node, selected: node.id === targetParent })),
        newNode,
      ]);
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${nodeId}`,
          source: targetParent,
          target: nodeId,
          type: 'smoothstep',
          label: item.edgeLabel ?? null,
        },
      ]);
      setSelectedNodeId(nodeId);
    },
    [selectedNodeId, setEdges, setNodes],
  );

  const updateNodeData = useCallback(
    (nodeId, updater) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;
          const nextData =
            typeof updater === 'function'
              ? updater(node.data ?? {}, node)
              : { ...node.data, ...updater };
          return {
            ...node,
            data: {
              ...node.data,
              ...nextData,
              fields: {
                ...(node.data?.fields ?? {}),
                ...(nextData?.fields ?? {}),
              },
            },
          };
        }),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (!nodeId || nodeId === rootNodeIdRef.current) return;
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      const fallback = rootNodeIdRef.current || findRootNodeId(nodesRef.current);
      if (fallback) {
        setSelectedNodeId(fallback);
      }
    },
    [setEdges, setNodes],
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    applyingHistoryRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    window.requestAnimationFrame(() => {
      applyingHistoryRef.current = false;
    });
  }, [setEdges, setNodes]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    applyingHistoryRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    window.requestAnimationFrame(() => {
      applyingHistoryRef.current = false;
    });
  }, [setEdges, setNodes]);

  const handleManualSave = useCallback(async () => {
    try {
      await persistGraph({ autosave: false });
      toast({ title: 'Enregistré', description: 'Blueprint sauvegardé.' });
      await fetchBlueprints();
    } catch (error) {
      void error;
    }
  }, [fetchBlueprints, persistGraph, toast]);

  const handleDeleteBlueprint = useCallback(async () => {
    if (!blueprintRef.current?.id) return;
    try {
      const currentId = blueprintRef.current.id;
      await deleteBlueprint(currentId);
      toast({ title: 'Supprimé', description: 'Le blueprint a été supprimé.' });
      await fetchBlueprints();
      const remaining = blueprints.filter((item) => item.id !== currentId);
      if (remaining.length > 0) {
        navigate(`/blueprint-builder/${remaining[0]?.id ?? ''}`, { replace: true });
      } else {
        navigate('/blueprint-builder', { replace: true });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le blueprint.', variant: 'destructive' });
    }
  }, [blueprints, fetchBlueprints, navigate, toast]);

  const handleDuplicateBlueprint = useCallback(async () => {
    if (!blueprintRef.current?.id) return null;
    try {
      const newId = await duplicateBlueprint(blueprintRef.current.id);
      toast({ title: 'Dupliqué', description: 'Une copie du blueprint a été créée.' });
      await fetchBlueprints();
      navigate(`/blueprint-builder/${newId}`);
      return newId;
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', description: 'Impossible de dupliquer le blueprint.', variant: 'destructive' });
      return null;
    }
  }, [fetchBlueprints, navigate, toast]);

  const handleSnapshot = useCallback(
    async (options = {}) => {
      if (!blueprintRef.current?.id) return null;
      try {
        const snapshotId = await createBlueprintSnapshot(blueprintRef.current.id, options);
        toast({ title: 'Snapshot créé', description: 'Un instantané a été ajouté.' });
        return snapshotId;
      } catch (error) {
        console.error(error);
        toast({ title: 'Erreur', description: 'Impossible de créer un snapshot.', variant: 'destructive' });
        return null;
      }
    },
    [toast],
  );

  const handleShare = useCallback(
    async (options = {}) => {
      if (!blueprintRef.current?.id) return null;
      try {
        const token = await createBlueprintShare(blueprintRef.current.id, options);
        toast({ title: 'Lien généré', description: 'Un lien lecture seule est prêt.' });
        return token;
      } catch (error) {
        console.error(error);
        toast({ title: 'Erreur', description: 'Impossible de générer un lien de partage.', variant: 'destructive' });
        return null;
      }
    },
    [toast],
  );

  const handleTitleChange = useCallback(
    (value) => {
      setBlueprint((prev) => (prev ? { ...prev, title: value } : prev));
      if (blueprintRef.current) {
        blueprintRef.current = { ...blueprintRef.current, title: value };
        if (blueprintRef.current.id) {
          debouncedRename(blueprintRef.current.id, value);
        }
      }
    },
    [debouncedRename],
  );

  useEffect(() => {
    const rootId = findRootNodeId(nodes);
    if (rootId) {
      rootNodeIdRef.current = rootId;
    }
    if (nodes.length > 0 && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(rootId ?? nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  return {
    state: {
      nodes,
      edges,
      blueprint,
      blueprints,
      palette,
      isLoading,
      isSaving,
      autosaveState,
      lastSavedAt,
      selectedNode,
      selectedNodeId,
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
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
      refreshBlueprints: fetchBlueprints,
    },
  };
};










