import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const PersonalQuoteLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Texte de la citation</Label>
        <Textarea
          rows={5}
          value={value.quoteText}
          onChange={handleChange('quoteText')}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Afficher le CTA</Label>
        <Switch
          checked={Boolean(value.showCta)}
          onCheckedChange={handleBoolean('showCta')}
        />
      </div>
      {value.showCta && (
        <div className="space-y-2">
          <Input
            placeholder="Texte du CTA"
            value={value.ctaText}
            onChange={handleChange('ctaText')}
          />
          <Input
            placeholder="Lien du CTA"
            value={value.ctaUrl}
            onChange={handleChange('ctaUrl')}
          />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Utiliser la couleur par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>
        {!value.useDefaultBackground && (
          <Input
            type="color"
            value={value.backgroundColor || '#000000'}
            onChange={handleChange('backgroundColor')}
          />
        )}
      </div>
    </div>
  );
};

export default PersonalQuoteLayoutEditor;
