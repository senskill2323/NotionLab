import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const localeOptions = [
  { value: 'fr', label: 'Francais (fr)' },
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Espagnol (es)' },
  { value: 'de', label: 'Allemand (de)' },
  { value: 'it', label: 'Italien (it)' },
];

const TestimonialsLayoutEditor = ({ value = {}, onChange }) => {
  const handleInput = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);

  const limitValue = Number.isFinite(Number(value.limit))
    ? Number(value.limit)
    : 6;

  const handleLimitChange = (event) => {
    const numeric = Number(event.target.value);
    onChange((current) => ({
      ...(current ?? {}),
      limit: Number.isFinite(numeric) ? numeric : 6,
    }));
  };

  const handleLocaleChange = (nextValue) => {
    if (!nextValue) return;
    onChange((current) => ({
      ...(current ?? {}),
      locale: nextValue,
    }));
  };

  const handleBackgroundVariantChange = (nextValue) => {
    if (!nextValue) return;
    onChange((current) => ({
      ...(current ?? {}),
      backgroundVariant: nextValue,
    }));
  };

  const highlightColor =
    typeof value.highlightColor === 'string' && value.highlightColor.trim()
      ? value.highlightColor
      : '#38BDF8';

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <Label>Titre</Label>
          <Input
            placeholder="Ils parlent de NotionLab"
            value={value.title ?? ''}
            onChange={handleInput('title')}
          />
        </div>
        <div>
          <Label>Sous-titre</Label>
          <Textarea
            rows={3}
            placeholder="Des retours authentiques de nos membres et clients..."
            value={value.subtitle ?? ''}
            onChange={handleInput('subtitle')}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Afficher le resume de notation</p>
            <p className="text-xs text-muted-foreground">
              Affiche la moyenne et le nombre total d avis lorsque disponibles.
            </p>
          </div>
          <Switch
            checked={value.showRatingSummary !== false}
            onCheckedChange={handleBoolean('showRatingSummary')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Label>Libelle du bouton</Label>
          <Input
            placeholder="Partager mon avis"
            value={value.ctaLabel ?? ''}
            onChange={handleInput('ctaLabel')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Nombre maximal d avis</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={limitValue}
              onChange={handleLimitChange}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Entre 1 et 10 avis seront affiches en carrousel.
            </p>
          </div>
          <div>
            <Label>Locale des avis</Label>
            <Select
              value={value.locale ?? 'fr'}
              onValueChange={handleLocaleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent>
                {localeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Defini la langue utilisee pour formater les dates relatives.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Apparence
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Couleur d accent</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                className="h-10 w-16 cursor-pointer"
                value={highlightColor}
                onChange={(event) => {
                  const nextColor = event.target.value;
                  onChange((current) => ({
                    ...(current ?? {}),
                    highlightColor: nextColor,
                  }));
                }}
              />
              <Input
                value={highlightColor}
                onChange={handleInput('highlightColor')}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Utilisee pour les etoiles et les elements d accent.
            </p>
          </div>
          <div>
            <Label>Theme</Label>
            <Select
              value={value.backgroundVariant === 'light' ? 'light' : 'dark'}
              onValueChange={handleBackgroundVariantChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Fond sombre</SelectItem>
                <SelectItem value="light">Fond clair</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Controle le contraste global du bloc.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TestimonialsLayoutEditor;
