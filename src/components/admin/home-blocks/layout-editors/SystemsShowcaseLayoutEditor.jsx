import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ui/image-upload';
import { createInputChangeHandler, ensureArray } from './shared';

const SystemsShowcaseLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const images = ensureArray(value.images);

  const updateImage = (index, nextValue) => {
    const nextImages = [...images];
    nextImages[index] = nextValue;
    onChange({
      ...value,
      images: nextImages,
    });
  };

  const addImage = () => {
    onChange({
      ...value,
      images: [...images, ''],
    });
  };

  const removeImage = (index) => {
    onChange({
      ...value,
      images: images.filter((_, i) => i !== index),
    });
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
              allowAspectRatioAdjustment
            />
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
