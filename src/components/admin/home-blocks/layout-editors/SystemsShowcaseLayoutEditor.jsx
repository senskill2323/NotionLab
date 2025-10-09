import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { Loader2 } from 'lucide-react';
import { createInputChangeHandler, ensureArray } from './shared';

const SystemsShowcaseLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const images = ensureArray(value.images);
  const [uploadStatuses, setUploadStatuses] = useState(() =>
    images.map(() => 'idle'),
  );

  useEffect(() => {
    const normalized = ensureArray(value.images);
    setUploadStatuses((prev) => {
      if (prev.length === normalized.length) {
        return prev;
      }
      return normalized.map((_, index) => prev[index] ?? 'idle');
    });
  }, [value.images]);

  const updateUploadStatus = (index, status) => {
    setUploadStatuses((prev) => {
      const next = [...prev];
      next[index] = status;
      return next;
    });
  };

  const updateImage = (index, nextValue) => {
    onChange((current = {}) => {
      const currentImages = ensureArray(current.images);
      const nextImages = currentImages.map((img, idx) =>
        idx === index ? nextValue : img,
      );
      return {
        ...current,
        images: nextImages,
      };
    });
    updateUploadStatus(index, 'idle');
  };

  const addImage = () => {
    onChange((current = {}) => {
      const currentImages = ensureArray(current.images);
      return {
        ...current,
        images: [...currentImages, ''],
      };
    });
    setUploadStatuses((prev) => [...prev, 'idle']);
  };

  const removeImage = (index) => {
    onChange((current = {}) => {
      const currentImages = ensureArray(current.images);
      return {
        ...current,
        images: currentImages.filter((_, i) => i !== index),
      };
    });
    setUploadStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleChange('title')} />
      </div>
      <div>
        <Label>Sous titre</Label>
        <Input value={value.titleSuffix} onChange={handleChange('titleSuffix')} />
      </div>
      <div className="space-y-3">
        <Label>Images (4 max)</Label>
        {images.map((image, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Image {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeImage(index)}
              >
                Supprimer
              </Button>
            </div>
            <ImageUpload
              currentImageUrl={image}
              onImageSelected={(url) => updateImage(index, url)}
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
              compact
              cropAspectRatio={3.357142857142857}
              onUploadStart={() => updateUploadStatus(index, 'uploading')}
              onUploadSuccess={() => updateUploadStatus(index, 'idle')}
              onUploadError={() => updateUploadStatus(index, 'error')}
            />
            {uploadStatuses[index] === 'uploading' && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Televersement en cours...</span>
              </div>
            )}
            {uploadStatuses[index] === 'error' && (
              <p className="text-xs text-destructive">
                Echec du televersement. Verifiez le bucket ou reessayez.
              </p>
            )}
            <Input
              value={image}
              onChange={(event) => updateImage(index, event.target.value)}
              placeholder="https://..."
            />
          </div>
        ))}
        {images.length < 4 && (
          <Button type="button" variant="outline" onClick={addImage}>
            Ajouter une image
          </Button>
        )}
      </div>
      <div>
        <Label>Texte du bouton</Label>
        <Input value={value.buttonText} onChange={handleChange('buttonText')} />
      </div>
      <div>
        <Label>Lien du bouton</Label>
        <Input value={value.buttonLink} onChange={handleChange('buttonLink')} />
      </div>
    </div>
  );
};

export default SystemsShowcaseLayoutEditor;
