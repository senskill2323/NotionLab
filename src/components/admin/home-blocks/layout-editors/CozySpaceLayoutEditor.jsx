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
import ImageUpload from '@/components/ui/image-upload';
import { createInputChangeHandler, createBooleanToggleHandler } from './shared';

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

const CozySpaceLayoutEditor = ({ value, onChange }) => {
  const handleInputChange = createInputChangeHandler(value, onChange);
  const handleBooleanChange = createBooleanToggleHandler(value, onChange);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const onIconSelect = (iconName) => {
    onChange({
      ...value,
      badgeIcon: iconName,
    });
    setShowIconPicker(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Badge</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={value.badgeText}
              onChange={handleInputChange('badgeText')}
              placeholder="Badge"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIconPicker(!showIconPicker)}
            >
              {value.badgeIcon}
            </Button>
          </div>
          {showIconPicker && (
            <div className="border rounded-md p-3 bg-muted/30">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Icône du badge
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {badgeIcons.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onIconSelect(name)}
                    className={`p-2 rounded border-2 transition-colors flex items-center justify-center ${
                      value.badgeIcon === name
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
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
          checked={Boolean(value.showBadge)}
          onCheckedChange={handleBooleanChange('showBadge')}
        />
      </div>

      <div>
        <Label>Titre</Label>
        <Input value={value.title} onChange={handleInputChange('title')} />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          rows={6}
          value={value.description}
          onChange={handleInputChange('description')}
        />
      </div>

      <div>
        <Label>Visuel principal</Label>
        <ImageUpload
          currentImageUrl={value.imageUrl}
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
          value={value.imageUrl}
          onChange={handleInputChange('imageUrl')}
        />
        <Input
          className="mt-2"
          placeholder="Texte alternatif"
          value={value.imageAlt}
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
              value={value.ctaText}
              onChange={handleInputChange('ctaText')}
            />
            <Input
              placeholder="URL"
              value={value.ctaUrl}
              onChange={handleInputChange('ctaUrl')}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Utiliser la couleur par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground)}
            onCheckedChange={handleBooleanChange('useDefaultBackground')}
          />
        </div>
        {!value.useDefaultBackground && (
          <div className="flex gap-2 items-center">
            <Input
              type="color"
              value={value.backgroundColor || '#1f2937'}
              onChange={handleInputChange('backgroundColor')}
              className="w-16 h-10 p-1 rounded cursor-pointer"
            />
            <Input
              value={value.backgroundColor || '#1f2937'}
              onChange={handleInputChange('backgroundColor')}
              placeholder="#1f2937"
              className="flex-1 font-mono text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CozySpaceLayoutEditor;
