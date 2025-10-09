import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import CozySpaceSectionWithUpload from './CozySpaceSectionWithUpload';
import layoutEditorMap from './layout-editors';
import {
  getDefaultEditorState,
  getLayoutDefinition,
  getLayoutPreviewProps,
  serializeLayoutContent,
} from './layoutRegistry';

const launchCtaGradientPresets = [
  { name: 'Sunset', start: '#ff6b35', end: '#f7931e', angle: 135 },
  { name: 'Ocean', start: '#36d1dc', end: '#5b86e5', angle: 135 },
  { name: 'Purple', start: '#a18cd1', end: '#fbc2eb', angle: 135 },
  { name: 'Forest', start: '#11998e', end: '#38ef7d', angle: 135 },
  { name: 'Fire', start: '#f12711', end: '#f5af19', angle: 135 },
  { name: 'Steel', start: '#bdc3c7', end: '#2c3e50', angle: 135 },
];

const maskGradientPresets = [
  { name: 'Pastel Aurora', start: '#EDF9FF', end: '#FFE8DB', angle: 125 },
  { name: 'Midnight Bloom', start: '#1d2671', end: '#c33764', angle: 140 },
  { name: 'Emerald City', start: '#13547a', end: '#80d0c7', angle: 135 },
  { name: 'Golden Hour', start: '#f2994a', end: '#f2c94c', angle: 135 },
  { name: 'Neon Dream', start: '#7f00ff', end: '#e100ff', angle: 135 },
  { name: 'Deep Ocean', start: '#0f2027', end: '#203a43', angle: 140 },
];

const HomeBlockLayoutEditor = ({
  layout,
  value,
  onChange,
  onContentChange,
  previewMode = 'desktop',
  fallbackJson,
  onFallbackJsonChange,
}) => {
  const definition = useMemo(() => getLayoutDefinition(layout), [layout]);
  const EditorComponent = layoutEditorMap[layout];

  const initialState = useMemo(() => {
    if (value) return value;
    if (definition) return definition.getDefaultState();
    return {};
  }, [definition, value]);

  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);

  useEffect(() => {
    stateRef.current = initialState;
    setState(initialState);
  }, [initialState, layout]);

  const emitState = useCallback(
    (nextValue) => {
      stateRef.current = nextValue;
      setState(nextValue);
      onChange?.(nextValue);
      if (definition) {
        onContentChange?.(serializeLayoutContent(layout, nextValue));
      }
    },
    [definition, layout, onChange, onContentChange],
  );

  const handleStateChange = useCallback(
    (nextValue) => {
      if (typeof nextValue === 'function') {
        emitState(nextValue(stateRef.current));
      } else {
        emitState(nextValue);
      }
    },
    [emitState],
  );

  const previewInfo = useMemo(() => {
    if (!definition) return null;
    if (layout === 'home.cozy_space') {
      const content = serializeLayoutContent(layout, state);
      return {
        component: CozySpaceSectionWithUpload,
        props: {
          content,
          previewMode,
          onImageChange: (url) =>
            handleStateChange({
              ...state,
              imageUrl: url,
            }),
        },
      };
    }
    return getLayoutPreviewProps(layout, state, { previewMode });
  }, [definition, layout, state, previewMode, handleStateChange]);

  const renderedEditor = useMemo(() => {
    if (EditorComponent) {
      return (
        <EditorComponent
          value={state}
          onChange={handleStateChange}
          presets={{
            launchCtaGradientPresets,
            maskGradientPresets,
          }}
        />
      );
    }

    const currentJson =
      typeof fallbackJson === 'string'
        ? fallbackJson
        : JSON.stringify(state ?? {}, null, 2);

    const handleJsonChange = (event) => {
      const nextJson = event.target.value;
      onFallbackJsonChange?.(nextJson);
      try {
        const parsed = JSON.parse(nextJson);
        handleStateChange(parsed);
      } catch (_) {
        /* swallow parse errors until JSON is valid */
      }
    };

    return <Textarea rows={18} value={currentJson} onChange={handleJsonChange} />;
  }, [EditorComponent, fallbackJson, handleStateChange, state, onFallbackJsonChange]);

  const renderedPreview = useMemo(() => {
    if (!previewInfo) {
      return (
        <div className="text-sm text-muted-foreground">
          Aucune prévisualisation disponible pour ce layout.
        </div>
      );
    }

    const { component: PreviewComponent, props } = previewInfo;
    return <PreviewComponent {...props} />;
  }, [previewInfo]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="lg:w-[26rem] flex-shrink-0">
        <CardContent className="space-y-4 pt-6">{renderedEditor}</CardContent>
      </Card>
      <Card className="flex-1 min-w-0">
        <CardContent className="pt-6 h-full">
          <div className="h-full overflow-auto rounded-xl border bg-background p-4">
            {renderedPreview}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeBlockLayoutEditor;
