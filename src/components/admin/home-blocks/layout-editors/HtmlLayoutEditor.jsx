
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const HtmlLayoutEditor = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>HTML</Label>
        <Textarea
          rows={10}
          value={value.html || ''}
          onChange={(event) =>
            onChange({
              ...value,
              html: event.target.value,
            })
          }
        />
      </div>
    </div>
  );
};

export default HtmlLayoutEditor;
