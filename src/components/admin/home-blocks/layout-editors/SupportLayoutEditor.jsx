import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/image-upload';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const gradientPresets = [
  'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  'linear-gradient(135deg, #312e81 0%, #1f2937 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #312e81 100%)',
  'linear-gradient(135deg, #0f766e 0%, #064e3b 100%)',
  'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
];

const DEFAULT_SOLID = '#111827';
const DEFAULT_GRADIENT = gradientPresets[0];
const BADGE_DEFAULTS = Object.freeze({
  enabled: true,
  label: 'Votre Bouee de Sauvetage Notion',
  textColor: '#2563eb',
  backgroundColor: '#dbeafe',
});

const SupportLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  const useDefaultBackground = value.useDefaultBackground !== false;

  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';

  const badgeLabelFallback =
    typeof value.badgeLabel === 'string' && value.badgeLabel.trim().length > 0
      ? value.badgeLabel
      : BADGE_DEFAULTS.label;
  const badge = {
    enabled: value?.badge?.enabled ?? true,
    label: value?.badge?.label ?? badgeLabelFallback,
    textColor: value?.badge?.textColor ?? BADGE_DEFAULTS.textColor,
    backgroundColor:
      value?.badge?.backgroundColor ?? BADGE_DEFAULTS.backgroundColor,
  };
  const badgeEnabled = badge.enabled !== false;

  const updateBadge = (patch) => {
    onChange((current) => {
      const currentBadge = current?.badge ?? {};
      const legacyLabel =
        typeof current?.badgeLabel === 'string' &&
        current.badgeLabel.trim().length > 0
          ? current.badgeLabel
          : BADGE_DEFAULTS.label;

      const merged = {
        enabled: currentBadge.enabled ?? true,
        label: currentBadge.label ?? legacyLabel,
        textColor: currentBadge.textColor ?? BADGE_DEFAULTS.textColor,
        backgroundColor:
          currentBadge.backgroundColor ?? BADGE_DEFAULTS.backgroundColor,
        ...patch,
      };

      const next = {
        ...(current ?? {}),
        badge: merged,
      };

      if ('badgeLabel' in next) {
        delete next.badgeLabel;
      }

      return next;
    });
  };

  const handleBadgeInput = (field) => (event) => {
    const nextValue =
      event && typeof event === 'object' && 'target' in event
        ? event.target.value
        : event;
    updateBadge({ [field]: nextValue ?? '' });
  };

  const handleBadgeToggle = (checked) =>
    updateBadge({ enabled: Boolean(checked) });

  const handleBadgeColorChange = (field) => (color) => {
    updateBadge({ [field]: color.hex });
  };

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
      patch.gradient = DEFAULT_GRADIENT;
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
        <Accordion type="single" collapsible>
          <AccordionItem value="badge">
            <AccordionTrigger>Badge</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm font-medium">Afficher le badge</Label>
                    <p className="text-xs text-muted-foreground">
                      Controle l'affichage et le style du badge au-dessus du titre.
                    </p>
                  </div>
                  <Switch checked={badgeEnabled} onCheckedChange={handleBadgeToggle} />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Texte du badge</Label>
                    <Input
                      value={badge.label ?? ''}
                      onChange={handleBadgeInput('label')}
                      disabled={!badgeEnabled}
                      placeholder="Ex. Support prioritaire"
                    />
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour conserver le texte par defaut.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Couleur du texte</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!badgeEnabled}
                            className="w-full justify-start gap-3"
                          >
                            <span
                              className="h-5 w-5 rounded-md border"
                              style={{
                                background: badge.textColor ?? BADGE_DEFAULTS.textColor,
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              Choisir une couleur
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <SketchPicker
                            disableAlpha
                            color={badge.textColor ?? BADGE_DEFAULTS.textColor}
                            onChangeComplete={handleBadgeColorChange('textColor')}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={badge.textColor ?? BADGE_DEFAULTS.textColor}
                        onChange={handleBadgeInput('textColor')}
                        disabled={!badgeEnabled}
                        placeholder={BADGE_DEFAULTS.textColor}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Utilisez un code hex (ex. #2563eb).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur de fond</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!badgeEnabled}
                            className="w-full justify-start gap-3"
                          >
                            <span
                              className="h-5 w-5 rounded-md border"
                              style={{
                                background:
                                  badge.backgroundColor ?? BADGE_DEFAULTS.backgroundColor,
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              Choisir une couleur
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <SketchPicker
                            disableAlpha
                            color={badge.backgroundColor ?? BADGE_DEFAULTS.backgroundColor}
                            onChangeComplete={handleBadgeColorChange('backgroundColor')}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={badge.backgroundColor ?? BADGE_DEFAULTS.backgroundColor}
                        onChange={handleBadgeInput('backgroundColor')}
                        disabled={!badgeEnabled}
                        placeholder={BADGE_DEFAULTS.backgroundColor}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Definissez la couleur d'arriere-plan du badge.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div>
          <Label>Titre</Label>
          <Input value={value.title ?? ''} onChange={handleChange('title')} />
        </div>
        <div>
          <Label>Sous titre</Label>
          <Textarea
            rows={4}
            value={value.subtitle ?? ''}
            onChange={handleChange('subtitle')}
          />
        </div>
        <div>
          <Label>Visuel</Label>
          <ImageUpload
            currentImageUrl={value.imageUrl ?? ''}
            onImageSelected={(url) =>
              onChange((current) => ({
                ...(current ?? {}),
                imageUrl: url,
              }))
            }
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            compact
          />
          <Input
            className="mt-2"
            value={value.imageUrl ?? ''}
            onChange={handleChange('imageUrl')}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>Texte alternatif</Label>
          <Input
            value={value.imageAlt ?? ''}
            onChange={handleChange('imageAlt')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par défaut</Label>
          <Switch
            checked={useDefaultBackground}
            onCheckedChange={(checked) =>
              handleBoolean('useDefaultBackground')(checked)
            }
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
                  onChange={handleChange('solidColor')}
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

export default SupportLayoutEditor;
