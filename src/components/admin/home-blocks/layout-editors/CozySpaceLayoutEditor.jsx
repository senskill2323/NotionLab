import React, { useState } from 'react';
import {
  Sparkles,
  Star,
  Crown,
  Zap,
  Heart,
  Trophy,
  Gift,
  Gem,
  Shield,
  Rocket,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/image-upload';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const badgeIcons = [
  { name: 'Sparkles', icon: Sparkles, label: 'Étincelles' },
  { name: 'Star', icon: Star, label: 'Étoile' },
  { name: 'Crown', icon: Crown, label: 'Couronne' },
  { name: 'Zap', icon: Zap, label: 'Éclair' },
  { name: 'Heart', icon: Heart, label: 'Cœur' },
  { name: 'Trophy', icon: Trophy, label: 'Trophée' },
  { name: 'Gift', icon: Gift, label: 'Cadeau' },
  { name: 'Gem', icon: Gem, label: 'Gemme' },
  { name: 'Shield', icon: Shield, label: 'Bouclier' },
  { name: 'Rocket', icon: Rocket, label: 'Fusée' },
];

const gradientPresets = [
  'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)',
  'linear-gradient(135deg, #0f766e 0%, #064e3b 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #312e81 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 90%)',
  'linear-gradient(135deg, #155e75 0%, #0f172a 100%)',
];

const DEFAULT_SOLID = '#1f2937';
const DEFAULT_GRADIENT = gradientPresets[0];

const CozySpaceLayoutEditor = ({ value = {}, onChange }) => {
  const handleInputChange = createInputChangeHandler(value, onChange);
  const handleBooleanChange = createBooleanToggleHandler(value, onChange);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const onIconSelect = (iconName) => {
    onChange((current) => ({
      ...(current ?? {}),
      badgeIcon: iconName,
    }));
    setShowIconPicker(false);
  };

  const useDefaultBackground = value.useDefaultBackground !== false;

  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';

  const setField =
    (field, extra = () => ({})) =>
    (nextValue) =>
      onChange((current) => ({
        ...(current ?? {}),
        [field]: nextValue,
        ...extra(nextValue, current ?? {}),
      }));

  const handleModeChange = (mode) => {
    if (!mode) return;
    const patch = { backgroundMode: mode };
    if (mode === 'solid' && !value.solidColor) {
      patch.solidColor = DEFAULT_SOLID;
      patch.backgroundColor = DEFAULT_SOLID;
    }
    if (mode === 'gradient' && !value.gradient) {
      patch.gradient = DEFAULT_GRADIENT;
      patch.backgroundGradient = DEFAULT_GRADIENT;
    }
    onChange((current) => ({
      ...(current ?? {}),
      ...patch,
    }));
  };

  const setSolidColor = setField('solidColor', (next) => ({
    backgroundColor: next,
  }));

  const setGradient = setField('gradient', (next) => ({
    backgroundGradient: next,
  }));

  const handleSolidColorChange = (color) => {
    setSolidColor(color.hex);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Badge</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={value.badgeText ?? ''}
              onChange={handleInputChange('badgeText')}
              placeholder="Badge"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIconPicker((prev) => !prev)}
            >
              {value.badgeIcon ?? 'Sparkles'}
            </Button>
          </div>
          {showIconPicker && (
            <div className="rounded-md border bg-muted/30 p-3">
              <Label className="mb-2 block text-xs text-muted-foreground">
                Icône du badge
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {badgeIcons.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onIconSelect(name)}
                    className={cn(
                      'flex items-center justify-center rounded border-2 p-2 transition-colors',
                      value.badgeIcon === name
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/50',
                    )}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Afficher le badge</Label>
        <Switch
          checked={Boolean(value.showBadge ?? true)}
          onCheckedChange={handleBooleanChange('showBadge')}
        />
      </div>

      <div>
        <Label>Titre</Label>
        <Input value={value.title ?? ''} onChange={handleInputChange('title')} />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          rows={6}
          value={value.description ?? ''}
          onChange={handleInputChange('description')}
        />
      </div>

      <div>
        <Label>Visuel principal</Label>
        <ImageUpload
          currentImageUrl={value.imageUrl ?? ''}
          onImageSelected={(url) =>
            onChange((current) => ({
              ...(current ?? {}),
              imageUrl: url,
            }))
          }
          acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
          compact
        />
        <Input
          className="mt-2"
          placeholder="https://..."
          value={value.imageUrl ?? ''}
          onChange={handleInputChange('imageUrl')}
        />
        <Input
          className="mt-2"
          placeholder="Texte alternatif"
          value={value.imageAlt ?? ''}
          onChange={handleInputChange('imageAlt')}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Afficher le CTA</Label>
          <Switch
            checked={Boolean(value.showCta)}
            onCheckedChange={handleBooleanChange('showCta')}
          />
        </div>
        {value.showCta && (
          <div className="space-y-2">
            <Input
              placeholder="Texte du bouton"
              value={value.ctaText ?? ''}
              onChange={handleInputChange('ctaText')}
            />
            <Input
              placeholder="URL"
              value={value.ctaUrl ?? ''}
              onChange={handleInputChange('ctaUrl')}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par défaut</Label>
          <Switch
            checked={useDefaultBackground}
            onCheckedChange={handleBooleanChange('useDefaultBackground')}
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
                  {gradientPresets.map((gradient) => (
                    <Button
                      key={gradient}
                      type="button"
                      variant="outline"
                      onClick={() => setGradient(gradient)}
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
      </div>
    </div>
  );
};

export default CozySpaceLayoutEditor;
