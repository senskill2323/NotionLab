import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { Loader2 } from 'lucide-react';
import { createInputChangeHandler } from './shared';

const FullpageWideImageLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const updateImage = (nextValue) => {
    onChange((current = {}) => ({
      ...current,
      imageUrl: nextValue,
    }));
    setUploadStatus('idle');
  };

  const resetImage = () => {
    updateImage('');
  };

  const handleImageFieldChange = (event) => {
    updateImage(event.target.value);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image large</Label>
        <ImageUpload
          currentImageUrl={value.imageUrl ?? ''}
          onImageSelected={updateImage}
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          compact
          cropAspectRatio={3.357142857142857}
          onUploadStart={() => setUploadStatus('uploading')}
          onUploadSuccess={() => setUploadStatus('idle')}
          onUploadError={() => setUploadStatus('error')}
        />
        {uploadStatus === 'uploading' && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Televersement en cours...</span>
          </div>
        )}
        {uploadStatus === 'error' && (
          <p className="text-xs text-destructive">
            Echec du televersement. Verifiez le bucket ou reessayez.
          </p>
        )}
        <Input
          value={value.imageUrl ?? ''}
          onChange={handleImageFieldChange}
          placeholder="https://..."
        />
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={resetImage}>
            Supprimer l'image
          </Button>
        </div>
      </div>
      <div>
        <Label>Texte alternatif</Label>
        <Input value={value.imageAlt ?? ''} onChange={handleChange('imageAlt')} />
      </div>
    </div>
  );
};

export default FullpageWideImageLayoutEditor;
