import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import ImageUpload from '@/components/ui/image-upload';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
  createOnFieldChange,
  ensureArray,
} from './shared';
import { DEFAULT_MASK_REVEAL_CONTENT } from '../layoutRegistry.shared';

const FALLBACK_ITEMS = DEFAULT_MASK_REVEAL_CONTENT.items;
const FALLBACK_IMAGES = DEFAULT_MASK_REVEAL_CONTENT.images;
const FALLBACK_PALETTE = DEFAULT_MASK_REVEAL_CONTENT.backgroundColors;

const MaskRevealLayoutEditor = ({ value = {}, onChange, presets = {} }) => {
  const emit = (patch) => {
    onChange((current) => ({
      ...(current ?? {}),
      ...patch,
    }));
  };

  const handleInput = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const setField = createOnFieldChange(value, onChange);

  const normalizedItems = useMemo(() => {
    const rawItems = ensureArray(value.items, FALLBACK_ITEMS);
    const length = Math.max(4, FALLBACK_ITEMS.length, rawItems.length);
    return Array.from({ length }, (_, index) => ({
      ...(FALLBACK_ITEMS[index] ?? {}),
      ...(rawItems[index] ?? {}),
    })).slice(0, 4);
  }, [value.items]);

  const normalizedImages = useMemo(() => {
    const rawImages = ensureArray(value.images, FALLBACK_IMAGES);
    const length = Math.max(4, FALLBACK_IMAGES.length, rawImages.length);
    return Array.from({ length }, (_, index) => ({
      ...(FALLBACK_IMAGES[index] ?? {}),
      ...(rawImages[index] ?? {}),
    })).slice(0, 4);
  }, [value.images]);

  const paletteColors = useMemo(() => {
    const rawColors = ensureArray(value.backgroundColors, FALLBACK_PALETTE);
    const length = Math.max(FALLBACK_PALETTE.length, rawColors.length);
    return Array.from({ length }, (_, index) => rawColors[index] ?? FALLBACK_PALETTE[index] ?? '#ffffff');
  }, [value.backgroundColors]);

  const gradientPresets = Array.isArray(presets.maskGradientPresets)
    ? presets.maskGradientPresets
    : [];

  const baseBackgroundColor =
    value.baseBackgroundColor ?? DEFAULT_MASK_REVEAL_CONTENT.baseBackgroundColor;
  const backgroundMode =
    value.backgroundMode ||
    (value.backgroundImage ? 'image' : value.backgroundGradient ? 'gradient' : 'color');

  const updateItem = (index, patch) => {
    onChange((current = {}) => {
      const rawItems = ensureArray(current.items, FALLBACK_ITEMS);
      const length = Math.max(4, FALLBACK_ITEMS.length, rawItems.length);
      const merged = Array.from({ length }, (_, idx) => ({
        ...(FALLBACK_ITEMS[idx] ?? {}),
        ...(rawItems[idx] ?? {}),
      })).slice(0, 4);

      const nextItems = merged.map((item, idx) =>
        idx === index
          ? {
              ...item,
              ...patch,
            }
          : { ...item },
      );

      return {
        ...current,
        items: nextItems,
      };
    });
  };

  const updateImage = (index, patch) => {
    onChange((current = {}) => {
      const rawImages = ensureArray(current.images, FALLBACK_IMAGES);
      const length = Math.max(4, FALLBACK_IMAGES.length, rawImages.length);
      const merged = Array.from({ length }, (_, idx) => ({
        ...(FALLBACK_IMAGES[idx] ?? {}),
        ...(rawImages[idx] ?? {}),
      })).slice(0, 4);

      const nextImages = merged.map((image, idx) =>
        idx === index
          ? {
              ...image,
              ...patch,
            }
          : { ...image },
      );

      return {
        ...current,
        images: nextImages,
      };
    });
  };

  const handleItemFieldChange = (index, field) => (event) => {
    updateItem(index, { [field]: event.target.value });
  };

  const handleItemLinkChange = (index, field) => (event) => {
    const currentItem = normalizedItems[index] ?? {};
    const fallbackLink = FALLBACK_ITEMS[index]?.link ?? {};
    const nextLink = {
      ...fallbackLink,
      ...(currentItem.link ?? {}),
      [field]: event.target.value,
    };
    updateItem(index, { link: nextLink });
  };

  const handleImageFieldChange = (index, field) => (event) => {
    const rawValue = event?.target?.value ?? event;
    let nextValue = rawValue;

    if (field === 'order') {
      if (rawValue === '' || rawValue == null) {
        nextValue = '';
      } else {
        const parsed = Number(rawValue);
        nextValue = Number.isFinite(parsed) ? parsed : '';
      }
    }

    updateImage(index, { [field]: nextValue });
  };

  const handlePaletteColorChange = (index) => (event) => {
    const nextColors = paletteColors.map((color, idx) =>
      idx === index ? event.target.value : color,
    );
    emit({ backgroundColors: nextColors });
  };

  const applyGradientPreset = (preset) => {
    const gradientValue = `linear-gradient(${preset.angle ?? 135}deg, ${preset.start} 0%, ${
      preset.end
    } 100%)`;
    emit({
      useDefaultBackground: false,
      backgroundMode: 'gradient',
      backgroundGradient: gradientValue,
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border/40 bg-muted/30 p-4">
        <div className="space-y-2">
          <Label>Base du fond (couleur de fallback)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              className="h-10 w-14 cursor-pointer rounded-md p-1"
              value={baseBackgroundColor}
              onChange={(event) => emit({ baseBackgroundColor: event.target.value })}
            />
            <Input
              value={baseBackgroundColor}
              onChange={(event) => emit({ baseBackgroundColor: event.target.value })}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Utiliser le fond par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>

        {!value.useDefaultBackground && (
          <div className="space-y-4 rounded-lg border border-dashed border-border/60 p-3">
            <div className="space-y-2">
              <Label>Mode de fond</Label>
              <div className="grid grid-cols-3 gap-2">
                {['color', 'gradient', 'image'].map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={backgroundMode === mode ? 'default' : 'outline'}
                    onClick={() => emit({ backgroundMode: mode })}
                    className="capitalize"
                  >
                    {mode === 'color' ? 'Couleur' : mode === 'gradient' ? 'Dégradé' : 'Image'}
                  </Button>
                ))}
              </div>
            </div>

            {backgroundMode === 'color' && (
              <div className="space-y-2">
                <Label>Couleur du fond</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-md p-1"
                    value={value.backgroundColor || '#ffffff'}
                    onChange={(event) => emit({ backgroundColor: event.target.value })}
                  />
                  <Input
                    value={value.backgroundColor || ''}
                    onChange={handleInput('backgroundColor')}
                    placeholder="#ffffff"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {backgroundMode === 'gradient' && (
              <div className="space-y-3">
                {gradientPresets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Presets rapides</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {gradientPresets.map((preset) => {
                        const gradientValue = `linear-gradient(${preset.angle ?? 135}deg, ${
                          preset.start
                        } 0%, ${preset.end} 100%)`;
                        const isActive = value.backgroundGradient === gradientValue;
                        return (
                          <Button
                            key={`${preset.name}-${preset.start}`}
                            type="button"
                            variant={isActive ? 'default' : 'outline'}
                            onClick={() => applyGradientPreset(preset)}
                            className="flex h-full flex-col gap-2 px-3 py-2 text-left"
                          >
                            <span className="text-xs font-medium">{preset.name}</span>
                            <span
                              className="h-9 w-full rounded-md border border-border/60"
                              style={{ backgroundImage: gradientValue }}
                            />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Dégradé CSS</Label>
                  <Textarea
                    rows={3}
                    value={value.backgroundGradient || ''}
                    onChange={handleInput('backgroundGradient')}
                    placeholder="linear-gradient(135deg, #EDF9FF 0%, #FFE8DB 100%)"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {backgroundMode === 'image' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Image de fond</Label>
                  <ImageUpload
                    compact
                    currentImageUrl={value.backgroundImage || ''}
                    onImageSelected={(url) =>
                      emit({
                        backgroundImage: url,
                        backgroundMode: 'image',
                      })
                    }
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  />
                </div>
                <Input
                  placeholder="https://..."
                  value={value.backgroundImage || ''}
                  onChange={handleInput('backgroundImage')}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label>Palette d’accompagnement</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {paletteColors.map((color, index) => (
              <div key={`palette-${index}`} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-md p-1"
                    value={color}
                    onChange={handlePaletteColorChange(index)}
                  />
                  <Input
                    value={color}
                    onChange={handlePaletteColorChange(index)}
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Couleur #{index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <Label className="text-sm font-semibold uppercase text-muted-foreground">
            Blocs révélés
          </Label>
          <p className="text-xs text-muted-foreground">
            Chaque bloc contrôle le couple texte / visuel affiché lors du scroll.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={['item-0']}>
          {normalizedItems.map((item, index) => {
            const image = normalizedImages[index] ?? {};
            const link = item.link ?? {};
            const accordionValue = `item-${index}`;
            const summary = item.title?.trim() || `Bloc ${index + 1}`;

            return (
              <AccordionItem key={accordionValue} value={accordionValue} className="border rounded-lg border-border/40 px-3">
                <AccordionTrigger className="py-3 text-left">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium">Bloc #{index + 1}</span>
                    <span className="text-xs text-muted-foreground truncate">{summary}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>ID (optionnel)</Label>
                        <Input
                          value={item.id || ''}
                          onChange={handleItemFieldChange(index, 'id')}
                          placeholder="green-arch"
                        />
                      </div>
                      <div>
                        <Label>Titre</Label>
                        <Input
                          value={item.title || ''}
                          onChange={handleItemFieldChange(index, 'title')}
                          placeholder="Titre du bloc"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Texte</Label>
                      <Textarea
                        rows={4}
                        value={item.description || ''}
                        onChange={handleItemFieldChange(index, 'description')}
                        placeholder="Décrivez le visuel associé à ce bloc…"
                      />
                    </div>

                    <div className="border border-border/40 rounded-lg p-3 space-y-3 bg-background/60">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Lien (facultatif)
                      </Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-1">
                          <Label>Libellé</Label>
                          <Input
                            value={link.label || ''}
                            onChange={handleItemLinkChange(index, 'label')}
                            placeholder="Learn more"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label>URL</Label>
                          <Input
                            value={link.href || ''}
                            onChange={handleItemLinkChange(index, 'href')}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label>Couleur du badge</Label>
                          <Input
                            value={link.backgroundColor || ''}
                            onChange={handleItemLinkChange(index, 'backgroundColor')}
                            placeholder="#D5FF37"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border border-border/40 rounded-lg p-3 space-y-3">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Visuel associé
                      </Label>
                      <ImageUpload
                        compact
                        currentImageUrl={image.src || ''}
                        onImageSelected={(url) => updateImage(index, { src: url })}
                        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>URL de l’image</Label>
                          <Input
                            value={image.src || ''}
                            onChange={handleImageFieldChange(index, 'src')}
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <Label>Texte alternatif</Label>
                          <Input
                            value={image.alt || ''}
                            onChange={handleImageFieldChange(index, 'alt')}
                            placeholder="Description courte du visuel"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>ID image (optionnel)</Label>
                          <Input
                            value={image.id || ''}
                            onChange={handleImageFieldChange(index, 'id')}
                            placeholder="green-image"
                          />
                        </div>
                        <div>
                          <Label>Ordre d’apparition</Label>
                          <Input
                            type="number"
                            min={1}
                            max={normalizedImages.length}
                            value={
                              image.order === '' || image.order == null
                                ? ''
                                : image.order
                            }
                            onChange={handleImageFieldChange(index, 'order')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>
    </div>
  );
};

export default MaskRevealLayoutEditor;
