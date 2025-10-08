import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
  ensureArray,
} from './shared';

const MaskRevealLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  const itemsJson = useMemo(
    () => JSON.stringify(ensureArray(value.items), null, 2),
    [value.items],
  );
  const imagesJson = useMemo(
    () => JSON.stringify(ensureArray(value.images), null, 2),
    [value.images],
  );

  const updateJsonField = (field, json) => {
    try {
      const parsed = JSON.parse(json);
      onChange({
        ...value,
        [field]: parsed,
      });
    } catch {
      // ignore parse errors, leave the previous value intact
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>
        {!value.useDefaultBackground && (
          <>
            <Label>Mode de fond (color | gradient | image)</Label>
            <Input
              value={value.backgroundMode || 'color'}
              onChange={handleChange('backgroundMode')}
            />
            <Label>Couleur de fond</Label>
            <Input
              value={value.backgroundColor || ''}
              onChange={handleChange('backgroundColor')}
            />
            <Label>Dégradé CSS</Label>
            <Textarea
              rows={2}
              value={value.backgroundGradient || ''}
              onChange={handleChange('backgroundGradient')}
            />
            <Label>Image de fond</Label>
            <Input
              value={value.backgroundImage || ''}
              onChange={handleChange('backgroundImage')}
            />
          </>
        )}
      </div>

      <div>
        <Label>Palette supplémentaire (JSON)</Label>
        <Textarea
          rows={3}
          value={JSON.stringify(ensureArray(value.backgroundColors))}
          onChange={(event) => updateJsonField('backgroundColors', event.target.value)}
        />
      </div>

      <div>
        <Label>Items (JSON)</Label>
        <Textarea
          rows={8}
          value={itemsJson}
          onChange={(event) => updateJsonField('items', event.target.value)}
        />
      </div>

      <div>
        <Label>Images (JSON)</Label>
        <Textarea
          rows={8}
          value={imagesJson}
          onChange={(event) => updateJsonField('images', event.target.value)}
        />
      </div>
    </div>
  );
};

export default MaskRevealLayoutEditor;
