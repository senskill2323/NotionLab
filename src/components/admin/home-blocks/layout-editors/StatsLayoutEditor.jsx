import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const gradientPresets = [
  'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #111827 100%)',
  'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
];

const DEFAULT_SOLID = '#0f172a';
const DEFAULT_GRADIENT = gradientPresets[0];

const StatsLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  const useDefaultBackground = value.useDefaultBackground !== false;
  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';

  const solidColorValue =
    value.solidColor || value.backgroundColor || DEFAULT_SOLID;
  const gradientValue =
    value.gradient || value.backgroundGradient || DEFAULT_GRADIENT;

  const updateState = (patch) =>
    onChange((current = {}) => ({
      ...(current ?? {}),
      ...patch,
    }));

  const handleModeChange = (mode) => {
    if (!mode) return;
    const patch = { backgroundMode: mode };
    if (mode === 'solid' && !value.solidColor && !value.backgroundColor) {
      patch.solidColor = DEFAULT_SOLID;
      patch.backgroundColor = DEFAULT_SOLID;
    }
    if (mode === 'gradient' && !value.gradient && !value.backgroundGradient) {
      patch.gradient = DEFAULT_GRADIENT;
      patch.backgroundGradient = DEFAULT_GRADIENT;
    }
    updateState(patch);
  };

  const handleSolidColorChange = (color) => {
    const hex = color?.hex ?? DEFAULT_SOLID;
    updateState({ solidColor: hex, backgroundColor: hex });
  };

  const handleSolidInputChange = (event) => {
    const hex = event?.target?.value ?? '';
    updateState({ solidColor: hex, backgroundColor: hex });
  };

  const handleGradientPreset = (preset) => {
    updateState({ gradient: preset, backgroundGradient: preset });
  };

  const handleGradientInputChange = (event) => {
    const nextValue = event?.target?.value ?? '';
    updateState({ gradient: nextValue, backgroundGradient: nextValue });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Titre</Label>
        <Input
          value={value.title ?? ''}
          onChange={handleChange('title')}
          placeholder="La force d'une communaute"
        />
      </div>
      <div>
        <Label>Sous titre</Label>
        <Textarea
          rows={3}
          value={value.subtitle ?? ''}
          onChange={handleChange('subtitle')}
          placeholder="Rejoignez une communaute grandissante..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par defaut</Label>
          <Switch
            checked={useDefaultBackground}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>

        {!useDefaultBackground && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex flex-col gap-2">
              <Label>Style de fond</Label>
              <ToggleGroup
                type="single"
                value={backgroundMode}
                onValueChange={handleModeChange}
                className="w-full md:w-auto"
              >
                <ToggleGroupItem value="solid" className="px-4">
                  Couleur
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
                        style={{ background: solidColorValue }}
                      />
                      <span className="text-xs text-muted-foreground">
                        Choisir une couleur
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SketchPicker
                      disableAlpha
                      color={solidColorValue}
                      onChangeComplete={handleSolidColorChange}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  value={solidColorValue}
                  onChange={handleSolidInputChange}
                  placeholder={DEFAULT_SOLID}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez le selecteur ou saisissez un code hexadecimal.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selection du degrade</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gradientPresets.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      onClick={() => handleGradientPreset(preset)}
                      className={cn(
                        'h-16 rounded-lg border-2 border-transparent transition hover:scale-[1.02]',
                        gradientValue === preset && 'border-primary shadow-md',
                      )}
                      style={{ backgroundImage: preset }}
                    />
                  ))}
                </div>
                <Input
                  value={gradientValue}
                  onChange={handleGradientInputChange}
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

export default StatsLayoutEditor;
