import { useState, useCallback } from 'react';
import {
  getDefaultEditorState,
  getLayoutDefinition,
  serializeLayoutContent,
  deserializeLayoutContent,
} from '@/components/admin/home-blocks/layoutRegistry';

export const buildHomeBlockEditorBundle = ({
  layout,
  blockType = 'dynamic',
  content,
} = {}) => {
  const definition = getLayoutDefinition(layout);
  if (!definition) {
    const fallback = content ?? {};
    return {
      layout,
      blockType,
      definition: null,
      state: fallback,
      serialized: fallback,
      fallbackJson: JSON.stringify(fallback, null, 2),
    };
  }

  const defaults = definition.getDefaultState();
  const state =
    content != null
      ? definition.deserialize(content, defaults)
      : defaults;

  return {
    layout,
    blockType: definition.blockType ?? blockType ?? 'dynamic',
    definition,
    state,
    serialized: serializeLayoutContent(layout, state),
    fallbackJson: '',
  };
};

const parseJsonSafe = (value) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('JSON invalide, impossible de parser le contenu.');
  }
};

const useHomeBlockEditor = ({
  initialLayout,
  initialBlockType = 'dynamic',
  initialContent,
  toast,
} = {}) => {
  const initialBundle = buildHomeBlockEditorBundle({
    layout: initialLayout,
    blockType: initialBlockType,
    content: initialContent,
  });

  const [layout, setLayout] = useState(initialBundle.layout);
  const [blockType, setBlockType] = useState(initialBundle.blockType);
  const [layoutDefinition, setLayoutDefinition] = useState(initialBundle.definition);
  const [editorState, setEditorState] = useState(initialBundle.state);
  const [serializedContent, setSerializedContent] = useState(initialBundle.serialized);
  const [fallbackJson, setFallbackJson] = useState(initialBundle.fallbackJson);

  const reset = useCallback(
    ({ nextLayout, nextBlockType = 'dynamic', content } = {}) => {
      const resolvedLayout = nextLayout ?? layout ?? initialLayout;
      const resolvedBlockType = nextBlockType ?? blockType ?? initialBlockType;
      const bundle = buildHomeBlockEditorBundle({
        layout: resolvedLayout,
        blockType: resolvedBlockType,
        content,
      });

      setLayout(resolvedLayout);
      setBlockType(bundle.blockType);
      setLayoutDefinition(bundle.definition);
      setEditorState(bundle.state);
      setSerializedContent(bundle.serialized);
      setFallbackJson(bundle.fallbackJson);
    },
    [blockType, initialBlockType, initialLayout, layout],
  );

  const handleStateChange = useCallback(
    (updater) => {
      setEditorState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (layoutDefinition) {
          setSerializedContent(serializeLayoutContent(layout, next));
        }
        return next;
      });
    },
    [layout, layoutDefinition],
  );

  const handleFallbackChange = useCallback(
    (value) => {
      setFallbackJson(value);
      if (!layoutDefinition) {
        try {
          const parsed = parseJsonSafe(value);
          setSerializedContent(parsed);
          setEditorState(parsed);
        } catch (_) {
          // On laisse l'utilisateur corriger son JSON avant de lever l'erreur au moment du save.
        }
      }
    },
    [layoutDefinition],
  );

  const getContentPayload = useCallback(() => {
    if (layoutDefinition) {
      return serializedContent ?? serializeLayoutContent(layout, editorState);
    }

    try {
      return parseJsonSafe(fallbackJson);
    } catch (error) {
      if (toast) {
        toast({
          title: 'Contenu invalide',
          description: error.message,
          variant: 'destructive',
        });
      }
      throw error;
    }
  }, [editorState, fallbackJson, layout, layoutDefinition, serializedContent, toast]);

  const hydrateFromRecord = useCallback(
    ({ recordLayout, recordBlockType = 'dynamic', recordContent }) => {
      reset({
        nextLayout: recordLayout,
        nextBlockType: recordBlockType,
        content: recordContent,
      });
    },
    [reset],
  );

  const buildMetadata = useCallback(
    (overrides = {}) => ({
      layout: overrides.layout ?? layout,
      block_type: overrides.blockType ?? blockType,
    }),
    [blockType, layout],
  );

  return {
    layout,
    blockType,
    layoutDefinition,
    editorState,
    serializedContent,
    fallbackJson,
    setSerializedContent,
    setEditorState: handleStateChange,
    setFallbackJson: handleFallbackChange,
    reset,
    hydrateFromRecord,
    getContentPayload,
    buildMetadata,
    setLayout: (nextLayout) => reset({ nextLayout }),
    setBlockType: (nextBlockType) => reset({ nextBlockType }),
  };
};

export default useHomeBlockEditor;
