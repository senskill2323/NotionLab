import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ImageUpload from '@/components/ui/image-upload';
import { createInputChangeHandler } from './shared';

const MainHeroLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Image pleine largeur</Label>
        <ImageUpload
          currentImageUrl={value.imageUrl}
          onImageSelected={(url) =>
            onChange((current) => ({
              ...(current ?? {}),
              imageUrl: url,
            }))
          }
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          compact
        />
        <Input
          className="mt-2"
          value={value.imageUrl}
          onChange={handleChange('imageUrl')}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Opacité de l’overlay (0 → 1)</Label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value.overlayOpacity ?? 0}
          onChange={(event) =>
            onChange((current) => ({
              ...(current ?? {}),
              overlayOpacity: Number(event.target.value),
            }))
          }
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">
          {Number(value.overlayOpacity ?? 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default MainHeroLayoutEditor;
