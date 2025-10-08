import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const LaunchCtaLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Date affichée</Label>
        <Input value={value.displayDate} onChange={handleChange('displayDate')} />
      </div>
      <div>
        <Label>Titre</Label>
        <Textarea
          rows={3}
          value={value.heading}
          onChange={handleChange('heading')}
        />
      </div>
      <div>
        <Label>Sous texte</Label>
        <Textarea
          rows={4}
          value={value.subText}
          onChange={handleChange('subText')}
        />
      </div>
      <div>
        <Label>Nom de l’icône</Label>
        <Input value={value.iconName} onChange={handleChange('iconName')} />
      </div>
      <div className="space-y-2">
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
              placeholder="Texte du bouton"
              value={value.buttonText}
              onChange={handleChange('buttonText')}
            />
            <Input
              placeholder="Lien du bouton"
              value={value.buttonLink}
              onChange={handleChange('buttonLink')}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Fond par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>
        {!value.useDefaultBackground && (
          <>
            <Input
              placeholder="Couleur hex"
              value={value.backgroundColor || ''}
              onChange={handleChange('backgroundColor')}
            />
            <div className="flex items-center justify-between">
              <Label>Utiliser le gradient par défaut</Label>
              <Switch
                checked={Boolean(value.useDefaultGradient)}
                onCheckedChange={handleBoolean('useDefaultGradient')}
              />
            </div>
            {!value.useDefaultGradient && (
              <Textarea
                rows={3}
                placeholder="linear-gradient(...)"
                value={value.backgroundGradient || ''}
                onChange={handleChange('backgroundGradient')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LaunchCtaLayoutEditor;
