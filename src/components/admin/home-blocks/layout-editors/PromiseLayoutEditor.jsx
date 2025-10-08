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

const PromiseLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const items = ensureArray(value.items);

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
        {value.useBackgroundImage ? (
          <Input
            placeholder="URL de l’image"
            value={value.backgroundImage}
            onChange={handleChange('backgroundImage')}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label>Fond par défaut</Label>
              <Switch
                checked={Boolean(value.useDefaultBackground)}
                onCheckedChange={handleBoolean('useDefaultBackground')}
              />
            </div>
            {!value.useDefaultBackground && (
              <Input
                placeholder="Couleur hex (#...)"
                value={value.backgroundColor}
                onChange={handleChange('backgroundColor')}
              />
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
