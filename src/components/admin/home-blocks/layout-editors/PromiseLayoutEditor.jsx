import React, { useMemo, useState } from 'react';
import { icons as lucideIcons } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SketchPicker } from 'react-color';
import { cn } from '@/lib/utils';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
  ensureArray,
} from './shared';

const ICON_LIMIT = 120;

const FALLBACK_ICONS = [
  'Users',
  'CalendarDays',
  'Zap',
  'Heart',
  'Star',
  'Crown',
  'Sparkles',
  'Target',
  'Shield',
  'Award',
  'CheckCircle',
  'Clock',
  'Globe',
  'Lightbulb',
  'Rocket',
  'Settings',
  'ChevronsUpDown',
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

const isIconComponent = (value) =>
  typeof value === 'function' ||
  (value && typeof value === 'object' && typeof value.render === 'function');

const buildIconOptions = () => {
  const entries = new Map();

  FALLBACK_ICONS.forEach((name) => {
    const icon = lucideIcons[name];
    if (isIconComponent(icon)) {
      entries.set(name, icon);
    }
  });

  for (const [name, component] of Object.entries(lucideIcons)) {
    if (entries.size >= ICON_LIMIT) break;
    if (
      name &&
      !entries.has(name) &&
      /^[A-Z]/.test(name) &&
      isIconComponent(component)
    ) {
      entries.set(name, component);
    }
  }

  return Array.from(entries.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, icon]) => ({ name, icon }));
};

const PromiseLayoutEditor = ({ value = {}, onChange }) => {
  const iconOptions = useMemo(() => buildIconOptions(), []);

  const iconLookup = useMemo(() => {
    const lookup = {};
    iconOptions.forEach(({ name, icon }) => {
      lookup[name] = icon;
    });
    return lookup;
  }, [iconOptions]);

  const DefaultIconComponent = iconLookup.Users ?? iconOptions[0]?.icon ?? (() => null);
  const ChevronsUpDownIcon = iconLookup.ChevronsUpDown ?? lucideIcons.ChevronsUpDown ?? null;

  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const items = ensureArray(value.items);
  const [iconSearch, setIconSearch] = useState({});
  const [iconPickerOpen, setIconPickerOpen] = useState({});
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
    onChange({
      ...(value ?? {}),
      ...patch,
    });
  };

  const setSolidColor = (next) =>
    onChange({
      ...(value ?? {}),
      solidColor: next,
      backgroundColor: next,
    });

  const setGradient = (next) =>
    onChange({
      ...(value ?? {}),
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
      ...(value ?? {}),
      items: nextItems,
    });
  };

  const addItem = () => {
    onChange({
      ...(value ?? {}),
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
      ...(value ?? {}),
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
        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
          {items.map((item, index) => {
            const IconComponent = iconLookup[item.icon] ?? DefaultIconComponent;
            const searchTerm = (iconSearch[index] ?? '').trim().toLowerCase();
            const filteredIcons = iconOptions.filter(({ name }) =>
              name.toLowerCase().includes(searchTerm),
            );

            return (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-2">
                  <div className="flex items-center gap-3 text-left">
                    <IconComponent className="h-4 w-4 text-primary" />
                    <span className="font-medium">Bloc #{index + 1}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[12rem]">
                      {item.title || 'Sans titre'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center justify-end pb-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      Supprimer
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.3fr_2fr]">
                    <div className="space-y-2">
                      <Label>Icone</Label>
                      <Popover
                        open={Boolean(iconPickerOpen[index])}
                        onOpenChange={(nextOpen) => {
                          setIconPickerOpen((prev) => ({
                            ...prev,
                            [index]: nextOpen,
                          }));
                          if (!nextOpen) {
                            setIconSearch((prev) => ({
                              ...prev,
                              [index]: '',
                            }));
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between gap-3"
                          >
                            <span className="flex items-center gap-3">
                              <IconComponent className="h-5 w-5 text-primary" />
                              <span className="text-sm">
                                {item.icon || 'Choisir une icone'}
                              </span>
                            </span>
                            {ChevronsUpDownIcon ? (
                              <ChevronsUpDownIcon className="h-4 w-4 text-muted-foreground" />
                            ) : null}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 space-y-3" align="start">
                          <Input
                            autoFocus
                            placeholder="Rechercher une icone"
                            value={iconSearch[index] ?? ''}
                            onChange={(event) =>
                              setIconSearch((prev) => ({
                                ...prev,
                                [index]: event.target.value,
                              }))
                            }
                          />
                          <ScrollArea className="h-56 rounded-md border">
                            <div className="grid grid-cols-6 gap-2 p-2 sm:grid-cols-8">
                              {filteredIcons.length === 0 ? (
                                <div className="col-span-full py-6 text-center text-sm text-muted-foreground">
                                  Aucune icone ne correspond  votre recherche.
                                </div>
                              ) : (
                                filteredIcons.map(({ name, icon: Icon }) => {
                                  const isSelected = item.icon === name;
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      onClick={() => {
                                        updateItem(index, { icon: name });
                                        setIconPickerOpen((prev) => ({
                                          ...prev,
                                          [index]: false,
                                        }));
                                        setIconSearch((prev) => ({
                                          ...prev,
                                          [index]: '',
                                        }));
                                      }}
                                      className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                        isSelected && 'border-primary bg-primary/10 text-primary',
                                      )}
                                      title={name}
                                    >
                                      {Icon ? <Icon className="h-5 w-5" /> : null}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
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
                  </div>
                  <div className="mt-3">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={item.text}
                      onChange={(event) =>
                        updateItem(index, { text: event.target.value })
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
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
              <Label>Fond par defaut</Label>
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
                      Utilisez le selecteur ou saisissez un code hex.
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
                      Selectionnez un degrade ou collez votre propre valeur CSS.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {useBackgroundImage && (
        <div>
          <Label>Opacite du voile</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={value.backgroundOpacity ?? 0.5}
            onChange={(event) =>
              onChange({
                ...(value ?? {}),
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
