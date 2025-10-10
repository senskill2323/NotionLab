import React from 'react';
import {
  Users,
  CalendarDays,
  Zap,
  Heart,
  Star,
  Crown,
  Sparkles,
  Target,
  Shield,
  Award,
  CheckCircle,
  Clock,
  Globe,
  Lightbulb,
  Rocket,
  Settings,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
  ensureArray,
} from './shared';

const promiseIcons = [
  { name: 'Users', icon: Users },
  { name: 'CalendarDays', icon: CalendarDays },
  { name: 'Zap', icon: Zap },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Crown', icon: Crown },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Target', icon: Target },
  { name: 'Shield', icon: Shield },
  { name: 'Award', icon: Award },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'Clock', icon: Clock },
  { name: 'Globe', icon: Globe },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Rocket', icon: Rocket },
  { name: 'Settings', icon: Settings },
];

const gradientPresets = [
  'linear-gradient(135deg, #4338ca 0%, #1d4ed8 50%, #0f172a 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #312e81 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #facc15 100%)',
];

const DEFAULT_SOLID = '#1f2937';
const DEFAULT_GRADIENT = gradientPresets[0];

const PromiseLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const items = ensureArray(value.items);
  const useBackgroundImage = Boolean(value.useBackgroundImage);
  const useDefaultBackground = value.useDefaultBackground !== false;
  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';
  const solidColor =
    value.solidColor ?? value.backgroundColor ?? DEFAULT_SOLID;
  const gradient =
    value.gradient ?? value.backgroundGradient ?? DEFAULT_GRADIENT;

  const applyPatch = (patch) =>
    onChange({
      ...(value ?? {}),
      ...patch,
    });

  const handleModeChange = (mode) => {
    if (!mode) return;
    const patch = { backgroundMode: mode };
    if (mode === 'solid' && !(value.solidColor ?? value.backgroundColor)) {
      patch.solidColor = DEFAULT_SOLID;
      patch.backgroundColor = DEFAULT_SOLID;
    }
    if (mode === 'gradient' && !(value.gradient ?? value.backgroundGradient)) {
      patch.gradient = DEFAULT_GRADIENT;
      patch.backgroundGradient = DEFAULT_GRADIENT;
    }
    applyPatch(patch);
  };

  const setSolidColor = (next) =>
    applyPatch({
      solidColor: next,
      backgroundColor: next,
    });

  const setGradient = (next) =>
    applyPatch({
      gradient: next,
      backgroundGradient: next,
    });

  const handleSolidColorChange = (color) => {
    setSolidColor(color?.hex ?? DEFAULT_SOLID);
  };

  const updateItem = (index, patch) => {
    const nextItems = items.map((item, idx) =>
      idx === index
        ? {
            ...item,
            ...patch,
          }
        : item,
    );
    onChange({
      ...value,
      items: nextItems,
    });
  };

  const addItem = () => {
    onChange({
      ...value,
      items: [
        ...items,
        {
          icon: 'Users',
          title: '',
          text: '',
        },
      ],
    });
  };

  const removeItem = (index) => {
    onChange({
      ...value,
      items: items.filter((_, idx) => idx !== index),
    });
  };

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

      <div className="space-y-4">
        <Label>Promesses</Label>
        {items.map((item, index) => {
          const IconComponent =
            promiseIcons.find((icon) => icon.name === item.icon)?.icon || Users;
          return (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <IconComponent className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Bloc #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="ml-auto"
                >
                  Supprimer
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Icône</Label>
                  <select
                    className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                    value={item.icon}
                    onChange={(event) =>
                      updateItem(index, { icon: event.target.value })
                    }
                  >
                    {promiseIcons.map(({ name }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={item.title}
                    onChange={(event) =>
                      updateItem(index, { title: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={item.text}
                    onChange={(event) =>
                      updateItem(index, { text: event.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={addItem}>
          Ajouter une promesse
        </Button>
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
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Utiliser une image de fond</Label>
          <Switch
            checked={Boolean(value.useBackgroundImage)}
            onCheckedChange={handleBoolean('useBackgroundImage')}
          />
        </div>
        {useBackgroundImage ? (
          <Input
            placeholder="URL de l'image"
            value={value.backgroundImage}
            onChange={handleChange('backgroundImage')}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label>Fond par défaut</Label>
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
                    onValueChange={(mode) => mode && handleModeChange(mode)}
                    className="w-full md:w-auto"
                  >
                    <ToggleGroupItem value="solid" className="px-4">
                      Couleur unique
                    </ToggleGroupItem>
                    <ToggleGroupItem value="gradient" className="px-4">
                      Dégradé
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
                            style={{ background: solidColor }}
                          />
                          <span className="text-xs text-muted-foreground">
                            Choisir une couleur
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <SketchPicker
                          disableAlpha
                          color={solidColor}
                          onChangeComplete={handleSolidColorChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={solidColor}
                      onChange={(event) => setSolidColor(event.target.value)}
                      placeholder={DEFAULT_SOLID}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisez le sélecteur ou saisissez un code hex.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Sélection du dégradé</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {gradientPresets.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          onClick={() => setGradient(preset)}
                          className={cn(
                            'h-16 rounded-lg border-2 border-transparent transition hover:scale-[1.02]',
                            gradient === preset && 'border-primary shadow-md',
                          )}
                          style={{ backgroundImage: preset }}
                        />
                      ))}
                    </div>
                    <Input
                      value={gradient}
                      onChange={(event) => setGradient(event.target.value)}
                      placeholder="linear-gradient(...)"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez un dégradé ou collez votre propre valeur CSS.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {value.useBackgroundImage && (
        <div>
          <Label>Opacité du voile</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={value.backgroundOpacity ?? 0.5}
            onChange={(event) =>
              onChange({
                ...value,
                backgroundOpacity: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default PromiseLayoutEditor;
