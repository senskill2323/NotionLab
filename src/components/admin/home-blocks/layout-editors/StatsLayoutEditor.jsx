import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createInputChangeHandler } from './shared';

const StatsLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleChange('title')} />
      </div>
      <div>
        <Label>Sous titre</Label>
        <Textarea
          rows={3}
          value={value.subtitle}
          onChange={handleChange('subtitle')}
        />
      </div>
    </div>
  );
};

export default StatsLayoutEditor;
