import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const gradientPresets = [
  'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
  'linear-gradient(135deg, #facc15 0%, #f97316 100%)',
  'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
];

const DEFAULT_SOLID = '#f97316';

const LaunchCtaLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';

  const setField = (field) => (nextValue) =>
    onChange((current) => ({
      ...(current ?? {}),
      [field]: nextValue,
    }));

  const handleModeChange = (mode) => {
    if (!mode) return;
    const patch = { backgroundMode: mode };
    if (mode === 'solid' && !value.solidColor) {
      patch.solidColor = DEFAULT_SOLID;
    }
    if (mode === 'gradient' && !value.gradient) {
      patch.gradient = gradientPresets[0];
    }
    onChange((current) => ({
      ...(current ?? {}),
      ...patch,
    }));
  };

  const handleSolidColorChange = (color) => {
    setField('solidColor')(color.hex);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Date affichee</Label>
          <Input
            value={value.displayDate ?? ''}
            onChange={handleChange('displayDate')}
          />
        </div>
        <div>
          <Label>Titre</Label>
          <Textarea
            rows={3}
            value={value.heading ?? ''}
            onChange={handleChange('heading')}
          />
        </div>
        <div>
          <Label>Sous texte</Label>
          <Textarea
            rows={4}
            value={value.subText ?? ''}
            onChange={handleChange('subText')}
          />
        </div>
        <div>
          <Label>Nom de l'icone</Label>
          <Input
            value={value.iconName ?? ''}
            onChange={handleChange('iconName')}
            placeholder="Heart, Sparkles, Star..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Afficher le CTA</Label>
          <Switch
            checked={Boolean(value.showCta)}
            onCheckedChange={handleBoolean('showCta')}
          />
        </div>
        {value.showCta && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Texte du bouton</Label>
              <Input
                placeholder="Texte du bouton"
                value={value.buttonText ?? ''}
                onChange={handleChange('buttonText')}
              />
            </div>
            <div className="space-y-2">
              <Label>Lien du bouton</Label>
              <Input
                placeholder="/contact"
                value={value.buttonLink ?? ''}
                onChange={handleChange('buttonLink')}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par defaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={(checked) =>
              handleBoolean('useDefaultBackground')(checked)
            }
          />
        </div>

        {!value.useDefaultBackground && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex flex-col gap-2">
              <Label>Style de fond</Label>
              <ToggleGroup
                type="single"
                value={backgroundMode}
                onValueChange={(mode) => mode && handleModeChange(mode)}
                className="w-full md:w-auto"
              >
                <ToggleGroupItem value="solid" className="px-4">
                  Couleur unique
                </ToggleGroupItem>
                <ToggleGroupItem value="gradient" className="px-4">
                  Degrade
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {backgroundMode === 'solid' ? (
              <div className="space-y-2">
                <Label>Couleur</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-3"
                    >
                      <span
                        className="h-5 w-5 rounded-md border"
                        style={{ background: value.solidColor ?? DEFAULT_SOLID }}
                      />
                      <span className="text-xs text-muted-foreground">
                        Choisir une couleur
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SketchPicker
                      disableAlpha
                      color={value.solidColor ?? DEFAULT_SOLID}
                      onChangeComplete={handleSolidColorChange}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  value={value.solidColor ?? DEFAULT_SOLID}
                  onChange={handleChange('solidColor')}
                  placeholder={DEFAULT_SOLID}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez le selecteur ou saisissez un code hex.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selection du degrade</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gradientPresets.map((gradient) => (
                    <Button
                      key={gradient}
                      type="button"
                      variant="outline"
                      onClick={() => setField('gradient')(gradient)}
                      className={cn(
                        'h-16 rounded-lg border-2 border-transparent transition hover:scale-[1.02]',
                        value.gradient === gradient && 'border-primary shadow-md',
                      )}
                      style={{ backgroundImage: gradient }}
                    />
                  ))}
                </div>
                <Input
                  value={value.gradient ?? ''}
                  onChange={handleChange('gradient')}
                  placeholder="linear-gradient(...)"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Selectionnez un degrade ou collez votre propre valeur CSS.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchCtaLayoutEditor;
