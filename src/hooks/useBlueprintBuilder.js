import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultBlueprintPalette } from '@/components/blueprints/BlueprintPalette';
import { sanitizeBlueprintGraph } from '@/lib/blueprints/graphUtils';
import { emitBlueprintAutosaveTelemetry } from '@/lib/blueprints/telemetry';

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

const cloneEdge = (edge) => {
  const next = { ...edge };
  if (edge.data) {
    next.data = {
      ...edge.data,
      metadata: { ...(edge.data?.metadata ?? {}) },
    };
  } else if ('data' in next) {
    delete next.data;
  }
  return next;
};

const cloneEdges = (edges) => edges.map((edge) => cloneEdge(edge));

const normalizePosition = (position = {}) => ({
  x: Number.isFinite(position?.x) ? position.x : 0,
  y: Number.isFinite(position?.y) ? position.y : 0,
});

const createPersistableNode = (node) => ({
  id: node.id,
  type: node.type,
  position: normalizePosition(node.position),
  data: {
    title: node.data?.title ?? '',
    family: node.data?.family ?? null,
    subfamily: node.data?.subfamily ?? null,
    elementKey: node.data?.elementKey ?? null,
    radius: node.data?.radius ?? 120,
    fields: { ...(node.data?.fields ?? {}) },
    metadata: { ...(node.data?.metadata ?? {}) },
  },
});

const createPersistableEdge = (edge) => {
  const persistable = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type ?? 'blueprintEdge',
    label: edge.label ?? undefined,
    data: {
      metadata: { ...(edge.data?.metadata ?? {}) },
    },
  };

  if (edge.sourceHandle) {
    persistable.sourceHandle = edge.sourceHandle;
  }
  if (edge.targetHandle) {
    persistable.targetHandle = edge.targetHandle;
  }

  return persistable;
};

const computeGraphSignature = (nodes, edges) =>
  JSON.stringify({
    nodes: nodes.map((node) => createPersistableNode(node)),
    edges: edges.map((edge) => createPersistableEdge(edge)),
  });

const AUTOSAVE_MAX_RETRIES = 3;
const AUTOSAVE_BASE_DELAY_MS = 1500;
const AUTOSAVE_MAX_DELAY_MS = 15000;
const HISTORY_MAX_LENGTH = 50;
const HISTORY_SNAPSHOT_DEBOUNCE_MS = 180;
const NODE_HISTORY_CHANGE_TYPES = ['add', 'remove', 'replace', 'reset'];
const EDGE_HISTORY_CHANGE_TYPES = ['add', 'remove', 'replace', 'reset', 'update'];

const isAutosaveConflictError = (error) => {
  if (!error) return false;
  const code = typeof error.code === 'string' ? error.code.toLowerCase() : null;
  const status = Number(error.status ?? error.code);
  if (status === 409) return true;
  if (code === '409' || code === 'conflict') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('autosave') && message.includes('confl');
};

export const useBlueprintBuilder = () => {
  const { blueprintId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialNodesRef = useRef(createInitialNodes());
  const nodesRef = useRef(initialNodesRef.current);
  const edgesRef = useRef([]);
  const [nodes, setNodes, baseOnNodesChange] = useNodesState(initialNodesRef.current);
  const [edges, setEdges, baseOnEdgesChange] = useEdgesState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [hasFetchedInitialList, setHasFetchedInitialList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaveBusy, setIsAutosaveBusy] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [autosaveVersion, setAutosaveVersion] = useState(0);
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
  const autosaveVersionRef = useRef(0);
  const autosaveQueueRef = useRef([]);
  const autosaveInFlightRef = useRef(false);
  const autosaveBusyRef = useRef(false);
  const autosaveSessionIdRef = useRef(uuidv4());
  const lastPersistedNodeIdsRef = useRef(new Set(initialNodesRef.current.map((node) => node.id).filter(Boolean)));
  const lastPersistedEdgeIdsRef = useRef(new Set());
  const deletedNodeIdsRef = useRef(new Set());
  const deletedEdgeIdsRef = useRef(new Set());
  const lastRecordedSignatureRef = useRef(computeGraphSignature(initialNodesRef.current, []));
  const historyDebounceTimerRef = useRef(null);
  const pendingHistoryStateRef = useRef(null);
  const pendingHistorySignatureRef = useRef(null);
  const historyFrameRef = useRef(null);
  const updateAutosaveBusyState = useCallback(() => {
    const hasQueuedAutosave = autosaveQueueRef.current.some((item) => item?.options?.autosave);
    const busy = autosaveInFlightRef.current || hasQueuedAutosave;
    autosaveBusyRef.current = busy;
    setIsAutosaveBusy(busy);
  }, []);

  const pushHistorySnapshot = useCallback(
    (nextNodes, nextEdges, { immediate = false } = {}) => {
      if (applyingHistoryRef.current || isHydratingRef.current) return;

      const signature = computeGraphSignature(nextNodes, nextEdges);
      if (signature === lastRecordedSignatureRef.current) return;

      const snapshot = {
        nodes: cloneNodes(nextNodes),
        edges: cloneEdges(nextEdges),
      };

      const commit = (snapshotToPersist, signatureToPersist) => {
        const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
        stack.push(snapshotToPersist);
        const nextStack =
          stack.length > HISTORY_MAX_LENGTH ? stack.slice(-HISTORY_MAX_LENGTH) : stack;
        historyRef.current = nextStack;
        historyIndexRef.current = nextStack.length - 1;
        lastRecordedSignatureRef.current = signatureToPersist;
      };

      if (immediate) {
        if (historyDebounceTimerRef.current) {
          clearTimeout(historyDebounceTimerRef.current);
          historyDebounceTimerRef.current = null;
        }
        pendingHistoryStateRef.current = null;
        pendingHistorySignatureRef.current = null;
        commit(snapshot, signature);
        return;
      }

      pendingHistoryStateRef.current = snapshot;
      pendingHistorySignatureRef.current = signature;

      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
      }

      historyDebounceTimerRef.current = setTimeout(() => {
        historyDebounceTimerRef.current = null;
        const pendingSnapshot = pendingHistoryStateRef.current;
        const pendingSignature = pendingHistorySignatureRef.current;
        pendingHistoryStateRef.current = null;
        pendingHistorySignatureRef.current = null;
        if (!pendingSnapshot || pendingSignature == null) return;
        if (pendingSignature === lastRecordedSignatureRef.current) return;
        commit(pendingSnapshot, pendingSignature);
      }, HISTORY_SNAPSHOT_DEBOUNCE_MS);
    },
    [],
  );

const scheduleHistorySnapshot = useCallback(
  ({ immediate = false } = {}) => {
    if (applyingHistoryRef.current || isHydratingRef.current) return;

    if (immediate) {
      pushHistorySnapshot(nodesRef.current, edgesRef.current, { immediate: true });
      return;
      }

      if (historyFrameRef.current !== null) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(historyFrameRef.current);
        }
        historyFrameRef.current = null;
      }

      if (typeof requestAnimationFrame === 'function') {
        historyFrameRef.current = requestAnimationFrame(() => {
          historyFrameRef.current = null;
          pushHistorySnapshot(nodesRef.current, edgesRef.current);
        });
      } else {
        pushHistorySnapshot(nodesRef.current, edgesRef.current);
      }
  },
  [pushHistorySnapshot],
);

  const removeEdgeById = useCallback(
    (edgeId) => {
      if (!edgeId) return;

      let removed = false;

      setEdges((eds) => {
        let didRemove = false;
        const nextEdges = eds.filter((edge) => {
          if (edge?.id === edgeId) {
            didRemove = true;
            if (lastPersistedEdgeIdsRef.current.has(edgeId)) {
              deletedEdgeIdsRef.current.add(edgeId);
            }
            return false;
          }
          return true;
        });

        removed = didRemove;
        return didRemove ? nextEdges : eds;
      });

      if (removed) {
        scheduleHistorySnapshot({ immediate: true });
      }
    },
    [scheduleHistorySnapshot, setEdges],
  );

  const attachEdgeHelpers = useCallback(
    (edge) => {
      if (!edge) return edge;

      const metadata = { ...(edge.data?.metadata ?? {}) };
      const metadataSourceHandle = metadata.sourceHandle ?? metadata.source_handle ?? null;
      const metadataTargetHandle = metadata.targetHandle ?? metadata.target_handle ?? null;
      const sourceHandle = edge.sourceHandle ?? metadataSourceHandle ?? null;
      const targetHandle = edge.targetHandle ?? metadataTargetHandle ?? null;

      let needsUpdate = false;

      if (edge.type !== 'blueprintEdge') {
        needsUpdate = true;
      }

      if (edge.data?.onDeleteEdge !== removeEdgeById) {
        needsUpdate = true;
      }

      if (metadata.sourceHandle !== sourceHandle) {
        if (sourceHandle) {
          metadata.sourceHandle = sourceHandle;
        } else {
          delete metadata.sourceHandle;
        }
        needsUpdate = true;
      }

      if (metadata.targetHandle !== targetHandle) {
        if (targetHandle) {
          metadata.targetHandle = targetHandle;
        } else {
          delete metadata.targetHandle;
        }
        needsUpdate = true;
      }

      if ('source_handle' in metadata) {
        delete metadata.source_handle;
        needsUpdate = true;
      }

      if ('target_handle' in metadata) {
        delete metadata.target_handle;
        needsUpdate = true;
      }

      if (!needsUpdate) {
        return edge;
      }

      const nextEdge = {
        ...edge,
        type: 'blueprintEdge',
        data: {
          ...(edge.data ?? {}),
          metadata,
          onDeleteEdge: removeEdgeById,
        },
      };

      if (sourceHandle) {
        nextEdge.sourceHandle = sourceHandle;
      } else if ('sourceHandle' in nextEdge) {
        delete nextEdge.sourceHandle;
      }

      if (targetHandle) {
        nextEdge.targetHandle = targetHandle;
      } else if ('targetHandle' in nextEdge) {
        delete nextEdge.targetHandle;
      }

      return nextEdge;
    },
    [removeEdgeById],
  );

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

  const debouncedRename = useDebouncedCallback(
    async (id, title) => {
      const expectedVersion = blueprintRef.current?.autosave_version ?? null;
      try {
        const result = await renameBlueprint({
          blueprintId: id,
          nextTitle: title,
          expectedAutosaveVersion: expectedVersion,
        });

        const nextVersion = result?.autosave_version;
        if (blueprintRef.current && blueprintRef.current.id === id) {
          const appliedVersion =
            typeof nextVersion === 'number' && Number.isFinite(nextVersion)
              ? nextVersion
              : blueprintRef.current.autosave_version;
          const updatedBlueprint = {
            ...blueprintRef.current,
            title,
            autosave_version: appliedVersion,
          };
          blueprintRef.current = updatedBlueprint;
          setBlueprint(updatedBlueprint);
          if (typeof nextVersion === 'number' && Number.isFinite(nextVersion)) {
            autosaveVersionRef.current = nextVersion;
            setAutosaveVersion(nextVersion);
          }
        }

        await fetchBlueprints();
      } catch (error) {
        console.error(error);
        if (isAutosaveConflictError(error)) {
          setAutosaveState('conflict');
          toast({
            title: 'Conflit de versions',
            description: 'Le blueprint a ete modifie ailleurs. Rechargez avant de renommer.',
            variant: 'destructive',
          });
          return;
        }
        toast({
          title: 'Erreur de renommage',
          description: 'Impossible de renommer le blueprint.',
          variant: 'destructive',
        });
      }
    },
    600,
  );

  const onNodesChange = useCallback(
    (changes = []) => {
      baseOnNodesChange(changes);
      const shouldRecord = changes.some((change) => {
        if (!change) return false;
        if (change.type === 'position') {
          return change.dragging === false || change.dragging === undefined;
        }
        const changeType = change.type ?? '';
        return NODE_HISTORY_CHANGE_TYPES.includes(changeType);
      });
      if (shouldRecord) {
        scheduleHistorySnapshot();
      }
    },
    [baseOnNodesChange, scheduleHistorySnapshot],
  );

  const onEdgesChange = useCallback(
    (changes = []) => {
      baseOnEdgesChange(changes);
      const shouldRecord = changes.some((change) => {
        if (!change) return false;
        if (change.type === 'select') return false;
        const changeType = change.type ?? '';
        return EDGE_HISTORY_CHANGE_TYPES.includes(changeType);
      });
      if (shouldRecord) {
        scheduleHistorySnapshot();
      }
    },
    [baseOnEdgesChange, scheduleHistorySnapshot],
  );

  const processAutosaveQueue = useCallback(() => {
    if (autosaveInFlightRef.current) return;

    const job = autosaveQueueRef.current.shift();
    if (!job) return;

    autosaveInFlightRef.current = true;
    updateAutosaveBusyState();

    const {
      nodes: jobNodes,
      edges: jobEdges,
      deletedNodeIds: jobDeletedNodeIds = [],
      deletedEdgeIds: jobDeletedEdgeIds = [],
      options,
      resolve,
      reject,
      attempt,
      maxAttempts,
      enqueuedAt,
      expectedAutosaveVersion,
    } = job;
    const deletedNodeIds = Array.isArray(jobDeletedNodeIds) ? jobDeletedNodeIds.filter(Boolean) : [];
    const deletedEdgeIds = Array.isArray(jobDeletedEdgeIds) ? jobDeletedEdgeIds.filter(Boolean) : [];
    const autosave = options.autosave !== false;
    const queueDepth = autosaveQueueRef.current.length;
    const effectiveAutosaveVersion =
      typeof expectedAutosaveVersion === 'number' && Number.isFinite(expectedAutosaveVersion)
        ? expectedAutosaveVersion
        : autosaveVersionRef.current;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (autosave) {
      setAutosaveState('saving');
    } else {
      setIsSaving(true);
    }

    const persistableNodes = jobNodes.map(createPersistableNode);
    const persistableEdges = jobEdges.map(createPersistableEdge);

    const durationNow = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return Math.round(now - startedAt);
    };

    const scheduleRetry = (nextAttempt, retryDelay, errorCode) => {
      emitBlueprintAutosaveTelemetry('retry', {
        session_id: autosaveSessionIdRef.current,
        autosave,
        attempt,
        expected_autosave_version: effectiveAutosaveVersion,
        queue_depth: queueDepth,
        retry_delay_ms: retryDelay,
        duration_ms: durationNow(),
        queued_ms: Date.now() - enqueuedAt,
        error_code: errorCode ?? null,
      });

      autosaveQueueRef.current.unshift({
        ...job,
        attempt: nextAttempt,
        enqueuedAt: Date.now(),
      });
      updateAutosaveBusyState();

      autosaveRetryTimerRef.current = setTimeout(() => {
        autosaveRetryTimerRef.current = null;
        autosaveInFlightRef.current = false;
        updateAutosaveBusyState();
        processAutosaveQueue();
      }, retryDelay);
    };

    upsertBlueprintGraph({
      blueprintId: blueprintRef.current?.id ?? null,
      title: blueprintRef.current?.title,
      description: blueprintRef.current?.description ?? null,
      status: blueprintRef.current?.status ?? 'draft',
      metadata: blueprintRef.current?.metadata ?? {},
      nodes: persistableNodes,
      edges: persistableEdges,
      deletedNodeIds,
      deletedEdgeIds,
      autosave,
      expectedAutosaveVersion: effectiveAutosaveVersion,
    })
      .then((savedId) => {
        if (!blueprintRef.current?.id && savedId) {
          blueprintRef.current = { ...blueprintRef.current, id: savedId };
          setBlueprint((prev) => (prev ? { ...prev, id: savedId } : prev));
          navigate(`/blueprint-builder/${savedId}`, { replace: true });
        }

        if (autosave) {
          const nextVersion = effectiveAutosaveVersion + 1;
          autosaveVersionRef.current = nextVersion;
          setAutosaveVersion(nextVersion);
          if (blueprintRef.current) {
            const updatedBlueprint = { ...blueprintRef.current, autosave_version: nextVersion };
            blueprintRef.current = updatedBlueprint;
            setBlueprint(updatedBlueprint);
          }
          setAutosaveState('idle');
        }
        setLastSavedAt(new Date());
        autosaveErrorToastShownRef.current = false;
        if (autosaveQueueRef.current.length === 0) {
          hasUnsavedChangesRef.current = false;
        }

        deletedNodeIdsRef.current = new Set();
        deletedEdgeIdsRef.current = new Set();
        lastPersistedNodeIdsRef.current = new Set(jobNodes.map((node) => node.id).filter(Boolean));
        lastPersistedEdgeIdsRef.current = new Set(jobEdges.map((edge) => edge.id).filter(Boolean));

        resolve(blueprintRef.current?.id ?? savedId ?? null);

        emitBlueprintAutosaveTelemetry('success', {
          session_id: autosaveSessionIdRef.current,
          expected_autosave_version: effectiveAutosaveVersion,
          autosave,
          attempt,
          queue_depth: queueDepth,
          duration_ms: durationNow(),
          queued_ms: Date.now() - enqueuedAt,
        });
      })
      .catch((error) => {
        if (isAutosaveConflictError(error)) {
          emitBlueprintAutosaveTelemetry('conflict', {
            session_id: autosaveSessionIdRef.current,
            expected_autosave_version: effectiveAutosaveVersion,
            autosave,
            attempt,
            queue_depth: queueDepth,
            duration_ms: durationNow(),
            queued_ms: Date.now() - enqueuedAt,
            error_code: error?.code ?? error?.status ?? null,
          });
          autosaveQueueRef.current = [];
          updateAutosaveBusyState();
          hasUnsavedChangesRef.current = true;
          if (autosave) {
            setAutosaveState('conflict');
            if (!autosaveErrorToastShownRef.current) {
              toast({
                title: 'Conflit de sauvegarde detecte',
                description: 'Des modifications concurrentes existent. Rechargez le blueprint pour continuer.',
                variant: 'destructive',
              });
              autosaveErrorToastShownRef.current = true;
            }
          } else {
            setAutosaveState('conflict');
            setIsSaving(false);
            toast({
              title: 'Conflit de versions',
              description: 'Le blueprint a ete modifie ailleurs. Rechargez avant de reessayer.',
              variant: 'destructive',
            });
          }
          const conflictError = new Error('AUTOSAVE_CONFLICT');
          conflictError.code = 'AUTOSAVE_CONFLICT';
          conflictError.originalError = error;
          reject(conflictError);
          return;
        }

        const nextAttempt = attempt + 1;
        const errorCode = error?.code ?? error?.status ?? error?.name ?? null;
        const canRetry = nextAttempt < maxAttempts;

        if (canRetry) {
          const retryDelay = Math.min(
            AUTOSAVE_MAX_DELAY_MS,
            AUTOSAVE_BASE_DELAY_MS * Math.pow(2, attempt),
          );
          scheduleRetry(nextAttempt, retryDelay, errorCode);
          return;
        }

        emitBlueprintAutosaveTelemetry('failed', {
          session_id: autosaveSessionIdRef.current,
          expected_autosave_version: effectiveAutosaveVersion,
          autosave,
          attempt,
          queue_depth: queueDepth,
          duration_ms: durationNow(),
          queued_ms: Date.now() - enqueuedAt,
          error_code: errorCode,
        });

        if (autosave) {
          setAutosaveState('error');
          if (!autosaveErrorToastShownRef.current) {
            toast({
              title: 'Sauvegarde automatique en echec',
              description: 'Les tentatives automatiques ont echoue. Essayez un enregistrement manuel.',
              variant: 'destructive',
            });
            autosaveErrorToastShownRef.current = true;
          }
        } else {
          toast({
            title: 'Erreur de sauvegarde',
            description: 'Impossible d\'enregistrer le blueprint.',
            variant: 'destructive',
          });
        }

        reject(error);
      })
      .finally(() => {
        const waitingForRetry = Boolean(autosaveRetryTimerRef.current);
        if (!waitingForRetry) {
          autosaveInFlightRef.current = false;
          updateAutosaveBusyState();
          if (!autosave) {
            setIsSaving(false);
          }
          processAutosaveQueue();
        }
      });
  }, [navigate, setAutosaveState, setAutosaveVersion, setBlueprint, setIsSaving, setLastSavedAt, toast, updateAutosaveBusyState]);

  const persistGraph = useCallback(
    ({ autosave = true } = {}) => {
      if (!blueprintRef.current) return Promise.resolve(null);

      const rawNodes = cloneNodes(nodes);
      const rawEdges = cloneEdges(edges);

      const {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        nodeIdMap,
        nodesChanged,
        edgesChanged,
      } = sanitizeBlueprintGraph({ nodes: rawNodes, edges: rawEdges });

      let processedEdges = sanitizedEdges;

      if (nodesChanged || edgesChanged) {
        applyingHistoryRef.current = true;
        setNodes(sanitizedNodes);
        const sanitizedEdgesWithHelpers = sanitizedEdges.map(attachEdgeHelpers);
        setEdges(sanitizedEdgesWithHelpers);
        processedEdges = sanitizedEdgesWithHelpers;

        if (nodesChanged) {
          const mappedRootId =
            rootNodeIdRef.current ? nodeIdMap.get(rootNodeIdRef.current) ?? rootNodeIdRef.current : null;

          if (mappedRootId) {
            rootNodeIdRef.current = mappedRootId;
          }

          setSelectedNodeId((currentSelectedId) => {
            if (!currentSelectedId) {
              return mappedRootId ?? sanitizedNodes[0]?.id ?? null;
            }
            const mappedSelected = nodeIdMap.get(currentSelectedId);
            if (mappedSelected) {
              return mappedSelected;
            }
            const stillExists = sanitizedNodes.some((node) => node.id === currentSelectedId);
            if (stillExists) {
              return currentSelectedId;
            }
            return mappedRootId ?? sanitizedNodes[0]?.id ?? currentSelectedId;
          });
        }

        if (historyRef.current.length > 0 && historyIndexRef.current >= 0) {
          const sanitizedSnapshot = {
            nodes: cloneNodes(sanitizedNodes),
            edges: cloneEdges(sanitizedEdgesWithHelpers),
          };
          historyRef.current[historyIndexRef.current] = sanitizedSnapshot;
          lastRecordedSignatureRef.current = computeGraphSignature(sanitizedNodes, sanitizedEdgesWithHelpers);
        }
        if (historyDebounceTimerRef.current) {
          clearTimeout(historyDebounceTimerRef.current);
          historyDebounceTimerRef.current = null;
        }
        if (historyFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(historyFrameRef.current);
        }
        historyFrameRef.current = null;
        pendingHistoryStateRef.current = null;
        pendingHistorySignatureRef.current = null;

        window.requestAnimationFrame(() => {
          applyingHistoryRef.current = false;
        });
      }

      const jobNodes = cloneNodes(sanitizedNodes);
      const jobEdges = cloneEdges(processedEdges);
      const currentNodeIdsSet = new Set(jobNodes.map((node) => node.id).filter(Boolean));
      const currentEdgeIdsSet = new Set(jobEdges.map((edge) => edge.id).filter(Boolean));
      const deletedNodeIds = Array.from(lastPersistedNodeIdsRef.current).filter((id) => id && !currentNodeIdsSet.has(id));
      const deletedEdgeIds = Array.from(lastPersistedEdgeIdsRef.current).filter((id) => id && !currentEdgeIdsSet.has(id));
      deletedNodeIdsRef.current = new Set(deletedNodeIds);
      deletedEdgeIdsRef.current = new Set(deletedEdgeIds);

      return new Promise((resolve, reject) => {
        if (autosave) {
          autosaveQueueRef.current = autosaveQueueRef.current.filter((item) => !item.options.autosave);
        }
        updateAutosaveBusyState();

        autosaveQueueRef.current.push({
          nodes: jobNodes,
          edges: jobEdges,
          deletedNodeIds,
          deletedEdgeIds,
          options: { autosave },
          resolve,
          reject,
          attempt: 0,
          maxAttempts: autosave ? AUTOSAVE_MAX_RETRIES + 1 : 1,
          enqueuedAt: Date.now(),
          expectedAutosaveVersion: autosaveVersionRef.current,
        });
        updateAutosaveBusyState();

        if (autosave) {
          setAutosaveState('saving');
        } else {
          setIsSaving(true);
        }

        processAutosaveQueue();
      });
    },
    [attachEdgeHelpers, edges, nodes, processAutosaveQueue, setAutosaveState, setEdges, setIsSaving, setNodes, setSelectedNodeId, updateAutosaveBusyState],
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

  useEffect(() => () => {
    if (autosaveRetryTimerRef.current) {
      clearTimeout(autosaveRetryTimerRef.current);
      autosaveRetryTimerRef.current = null;
    }
  }, []);


  useEffect(() => {
    if (!hasLoadedOnceRef.current || isHydratingRef.current) return;
    hasUnsavedChangesRef.current = true;
    debouncedAutosave();
  }, [nodes, edges, debouncedAutosave]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => () => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (historyFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(historyFrameRef.current);
    }
    historyFrameRef.current = null;
    pendingHistoryStateRef.current = null;
    pendingHistorySignatureRef.current = null;
  }, []);

  const hydrateFromPayload = useCallback(
    (payload, { focus = true } = {}) => {
      isHydratingRef.current = true;
      const nextBlueprint = payload?.blueprint ?? null;
      const nodesFromPayload = payload?.nodes?.length
        ? payload.nodes
        : createInitialNodes(nextBlueprint?.title ?? 'Blueprint');
      const edgesFromPayload = payload?.edges?.length ? payload.edges : [];

      const normalizedAutosaveVersion = (() => {
        const raw = nextBlueprint?.autosave_version;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        const parsed = Number(raw ?? 0);
        return Number.isFinite(parsed) ? parsed : 0;
      })();
      const normalizedBlueprint = nextBlueprint
        ? { ...nextBlueprint, autosave_version: normalizedAutosaveVersion }
        : null;

      setBlueprint(normalizedBlueprint);
      blueprintRef.current = normalizedBlueprint;
      setLastSavedAt(normalizedBlueprint?.updated_at ? new Date(normalizedBlueprint.updated_at) : null);
      autosaveVersionRef.current = normalizedAutosaveVersion;
      setAutosaveVersion(normalizedAutosaveVersion);

      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }
      autosaveQueueRef.current = [];
      autosaveInFlightRef.current = false;
      autosaveErrorToastShownRef.current = false;
      updateAutosaveBusyState();
      deletedNodeIdsRef.current = new Set();
      deletedEdgeIdsRef.current = new Set();
      lastPersistedNodeIdsRef.current = new Set(nodesFromPayload.map((node) => node.id).filter(Boolean));
      lastPersistedEdgeIdsRef.current = new Set(edgesFromPayload.map((edge) => edge.id).filter(Boolean));
      setAutosaveState('idle');
      setIsSaving(false);
      autosaveSessionIdRef.current = uuidv4();

      const edgesWithHelpers = edgesFromPayload.map(attachEdgeHelpers);

      setNodes(() => nodesFromPayload);
      setEdges(() => edgesWithHelpers);
      nodesRef.current = nodesFromPayload;
      edgesRef.current = edgesWithHelpers;

      const rootId = findRootNodeId(nodesFromPayload);
      rootNodeIdRef.current = rootId;
      setSelectedNodeId(rootId);

      const initialSnapshot = {
        nodes: cloneNodes(nodesFromPayload),
        edges: cloneEdges(edgesWithHelpers),
      };
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
      hasUnsavedChangesRef.current = false;
      hasLoadedOnceRef.current = true;
      lastRecordedSignatureRef.current = computeGraphSignature(nodesFromPayload, edgesWithHelpers);
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      if (historyFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(historyFrameRef.current);
      }
      historyFrameRef.current = null;
      pendingHistoryStateRef.current = null;
      pendingHistorySignatureRef.current = null;

      window.requestAnimationFrame(() => {
        isHydratingRef.current = false;
        if (focus && rootId) {
          setNodes((current) =>
            current.map((node) => ({ ...node, selected: node.id === rootId })),
          );
        }
      });
    },
    [attachEdgeHelpers, setEdges, setNodes, setAutosaveState, setIsSaving, updateAutosaveBusyState],
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

  const showAutosaveBusyToast = useCallback(() => {
    toast({
      title: 'Sauvegarde automatique en cours',
      description: 'Patientez quelques secondes puis reessayez.',
    });
  }, [toast]);

  const resolveAutosaveConflict = useCallback(async () => {
    const currentId = blueprintRef.current?.id;

    if (!currentId) {
      autosaveQueueRef.current = [];
      hasUnsavedChangesRef.current = false;
      setIsSaving(false);
      setAutosaveState('idle');
      autosaveErrorToastShownRef.current = false;
      return;
    }

    if (autosaveBusyRef.current) {
      showAutosaveBusyToast();
      return;
    }

    try {
      await loadBlueprint(currentId);
      autosaveErrorToastShownRef.current = false;
      setIsSaving(false);
    } catch (error) {
      console.error(error);
      // loadBlueprint already surface a toast on failure
    }
  }, [loadBlueprint, setAutosaveState, setIsSaving, showAutosaveBusyToast]);

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
          expectedAutosaveVersion: 0,
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
      const metadata = connection?.data?.metadata ? { ...connection.data.metadata } : {};

      if (connection.sourceHandle) {
        metadata.sourceHandle = connection.sourceHandle;
      }
      if (connection.targetHandle) {
        metadata.targetHandle = connection.targetHandle;
      }

      const safeConnection = attachEdgeHelpers({
        ...connection,
        id: uuidv4(),
        type: 'blueprintEdge',
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        data: {
          metadata,
          onDeleteEdge: removeEdgeById,
        },
      });

      setEdges((eds) => addEdge(safeConnection, eds.map(attachEdgeHelpers)));
      scheduleHistorySnapshot();
    },
    [attachEdgeHelpers, removeEdgeById, scheduleHistorySnapshot, setEdges],
  );

  const addNodeFromPalette = useCallback(
    (item, position, parentId) => {
      const targetParent =
        parentId || selectedNodeId || rootNodeIdRef.current || findRootNodeId(nodesRef.current);
      const nodeId = uuidv4();
      const elementKey = item.elementKey ?? nodeId;
      const normalizedPosition = normalizePosition(position);
      const newNode = {
        id: nodeId,
        type: 'bubbleNode',
        position: normalizedPosition,
        data: {
          title: item.label,
          family: item.family,
          subfamily: item.subfamily,
          elementKey,
          radius: item.radius ?? 120,
          fields: item.fields ? { ...item.fields } : {},
          metadata: {
            ...(item.metadata ?? {}),
            paletteId: item.id ?? null,
          },
        },
      };

      setNodes((nds) => [
        ...nds.map((node) => ({ ...node, selected: node.id === targetParent })),
        newNode,
      ]);
      if (targetParent && targetParent !== nodeId) {
        const connection = attachEdgeHelpers({
          id: uuidv4(),
          source: targetParent,
          target: nodeId,
          type: 'blueprintEdge',
          sourceHandle: 'center-source',
          targetHandle: 'center-target',
          data: {
            metadata: {
              sourceHandle: 'center-source',
              targetHandle: 'center-target',
            },
            onDeleteEdge: removeEdgeById,
          },
        });
        setEdges((eds) => addEdge(connection, eds.map(attachEdgeHelpers)));
      }
      setSelectedNodeId(nodeId);
      scheduleHistorySnapshot();
    },
    [attachEdgeHelpers, removeEdgeById, scheduleHistorySnapshot, selectedNodeId, setEdges, setNodes, setSelectedNodeId],
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
      scheduleHistorySnapshot();
    },
    [scheduleHistorySnapshot, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      if (!nodeId || nodeId === rootNodeIdRef.current) return;
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => {
        let mutated = false;
        const nextEdges = eds.filter((edge) => {
          const shouldRemove = edge.source === nodeId || edge.target === nodeId;
          if (shouldRemove) {
            mutated = true;
            if (lastPersistedEdgeIdsRef.current.has(edge.id)) {
              deletedEdgeIdsRef.current.add(edge.id);
            }
          }
          return !shouldRemove;
        });

        return mutated ? nextEdges : eds;
      });
      const fallback = rootNodeIdRef.current || findRootNodeId(nodesRef.current);
      if (fallback) {
        setSelectedNodeId(fallback);
      }
      scheduleHistorySnapshot({ immediate: true });
    },
    [scheduleHistorySnapshot, setEdges, setNodes],
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (historyFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(historyFrameRef.current);
    }
    historyFrameRef.current = null;
    pendingHistoryStateRef.current = null;
    pendingHistorySignatureRef.current = null;

    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    const snapshotNodes = cloneNodes(snapshot.nodes);
    const snapshotEdges = cloneEdges(snapshot.edges);
    const hydratedEdges = snapshotEdges.map(attachEdgeHelpers);
    applyingHistoryRef.current = true;
    setNodes(snapshotNodes);
    setEdges(hydratedEdges);
    lastRecordedSignatureRef.current = computeGraphSignature(snapshotNodes, hydratedEdges);
    window.requestAnimationFrame(() => {
      applyingHistoryRef.current = false;
    });
  }, [attachEdgeHelpers, setEdges, setNodes]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (historyFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(historyFrameRef.current);
    }
    historyFrameRef.current = null;
    pendingHistoryStateRef.current = null;
    pendingHistorySignatureRef.current = null;

    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    const snapshotNodes = cloneNodes(snapshot.nodes);
    const snapshotEdges = cloneEdges(snapshot.edges);
    const hydratedEdges = snapshotEdges.map(attachEdgeHelpers);
    applyingHistoryRef.current = true;
    setNodes(snapshotNodes);
    setEdges(hydratedEdges);
    lastRecordedSignatureRef.current = computeGraphSignature(snapshotNodes, hydratedEdges);
    window.requestAnimationFrame(() => {
      applyingHistoryRef.current = false;
    });
  }, [attachEdgeHelpers, setEdges, setNodes]);

  const handleManualSave = useCallback(async () => {
    if (autosaveState === 'conflict') {
      toast({
        title: 'Conflit de versions',
        description: 'Rechargez le blueprint avant de sauvegarder.',
        variant: 'destructive',
      });
      return;
    }

    if (autosaveBusyRef.current) {
      toast({
        title: 'Sauvegarde automatique en cours',
        description: 'Patientez quelques secondes puis reessayez.',
      });
      return;
    }

    try {
      await persistGraph({ autosave: false });
      toast({ title: 'Enregistré', description: 'Blueprint sauvegardé.' });
      await fetchBlueprints();
    } catch (error) {
      void error;
    }
  }, [autosaveState, fetchBlueprints, persistGraph, toast]);

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
      const { silent = false, ...shareOptions } = options;
      try {
        const share = await createBlueprintShare(blueprintRef.current.id, shareOptions);
        if (!share?.token) {
          throw new Error('Invalid share response');
        }
        if (!silent) {
          const expiresLabel = share.expiresAt
            ? new Date(share.expiresAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
            : null;
          toast({
            title: 'Lien g�n�r�',
            description: expiresLabel
              ? `Expiration le ${expiresLabel}.`
              : 'Le lien expire automatiquement dans 7 jours.',
          });
        }
        return share;
      } catch (error) {
        console.error(error);
        toast({ title: 'Erreur', description: 'Impossible de g�n�rer un lien de partage.', variant: 'destructive' });
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
      isAutosaveBusy,
      autosaveState,
      autosaveVersion,
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
      resolveConflict: resolveAutosaveConflict,
      refreshBlueprints: fetchBlueprints,
    },
  };
};
