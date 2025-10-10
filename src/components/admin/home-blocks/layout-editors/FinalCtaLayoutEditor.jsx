import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInputChangeHandler } from './shared';

const FinalCtaLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleChange('title')} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          rows={4}
          value={value.description}
          onChange={handleChange('description')}
        />
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

export default FinalCtaLayoutEditor;
