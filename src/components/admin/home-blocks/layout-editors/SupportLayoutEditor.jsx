import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import { createInputChangeHandler } from './shared';

const SupportLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Badge</Label>
        <Input value={value.badgeLabel} onChange={handleChange('badgeLabel')} />
      </div>
      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleChange('title')} />
      </div>
      <div>
        <Label>Sous titre</Label>
        <Textarea
          rows={4}
          value={value.subtitle}
          onChange={handleChange('subtitle')}
        />
      </div>
      <div>
        <Label>Visuel</Label>
        <ImageUpload
          currentImageUrl={value.imageUrl}
          onImageSelected={(url) =>
            onChange({
              ...value,
              imageUrl: url,
            })
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
        <Label>Texte alternatif</Label>
        <Input value={value.imageAlt} onChange={handleChange('imageAlt')} />
      </div>
    </div>
  );
};

export default SupportLayoutEditor;
