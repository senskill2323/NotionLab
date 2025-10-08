import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInputChangeHandler } from './shared';

const FormationsLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleChange('title')} />
      </div>
      <div>
        <Label>Suffixe</Label>
        <Input value={value.titleSuffix} onChange={handleChange('titleSuffix')} />
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
        <Label>Image de fond</Label>
        <Input
          value={value.backgroundImageUrl}
          onChange={handleChange('backgroundImageUrl')}
        />
      </div>
    </div>
  );
};

export default FormationsLayoutEditor;
