
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createInputChangeHandler } from './shared';

const TubesCursorLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Ligne 1</Label>
        <Input value={value.title1} onChange={handleChange('title1')} />
      </div>
      <div>
        <Label>Ligne 2</Label>
        <Input value={value.title2} onChange={handleChange('title2')} />
      </div>
      <div>
        <Label>Ligne 3</Label>
        <Input value={value.title3} onChange={handleChange('title3')} />
      </div>
    </div>
  );
};

export default TubesCursorLayoutEditor;
