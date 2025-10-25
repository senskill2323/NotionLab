import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import ImageUpload from '@/components/ui/image-upload';
import {
  createInputChangeHandler,
  createBooleanToggleHandler,
} from './shared';

const PersonalQuoteImageLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const isLogoEnabled = useMemo(
    () => (value.showLogo === undefined ? true : Boolean(value.showLogo)),
    [value.showLogo],
  );

  const updateImageUrl = (nextUrl) => {
    onChange((current = {}) => ({
      ...current,
      imageUrl: nextUrl,
    }));
    setUploadStatus('idle');
  };

  const resetImage = () => updateImageUrl('');

  const handleUploadStart = () => setUploadStatus('uploading');
  const handleUploadSuccess = () => setUploadStatus('idle');
  const handleUploadError = () => setUploadStatus('error');

  return (
    <div className="space-y-6">
      <div>
        <Label>Texte de la citation</Label>
        <Textarea
          rows={5}
          value={value.quoteText ?? ''}
          onChange={handleChange('quoteText')}
        />
      </div>

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
            value={value.ctaText ?? ''}
            onChange={handleChange('ctaText')}
          />
          <Input
            placeholder="Lien du CTA"
            value={value.ctaUrl ?? ''}
            onChange={handleChange('ctaUrl')}
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Utiliser la couleur par défaut</Label>
          <Switch
            checked={Boolean(value.useDefaultBackground ?? true)}
            onCheckedChange={handleBoolean('useDefaultBackground')}
          />
        </div>
        {value.useDefaultBackground === false && (
          <Input
            type="color"
            value={value.backgroundColor ?? '#000000'}
            onChange={handleChange('backgroundColor')}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Image principale (requis)</Label>
          {uploadStatus === 'uploading' && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Televersement en cours...</span>
            </div>
          )}
          {uploadStatus === 'error' && (
            <span className="text-xs text-destructive">
              Televersement echoue, reessayez.
            </span>
          )}
        </div>
        <ImageUpload
          currentImageUrl={value.imageUrl ?? ''}
          onImageSelected={updateImageUrl}
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          compact
          cropAspectRatio={1}
          onUploadStart={handleUploadStart}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
        <Input
          placeholder="https://..."
          value={value.imageUrl ?? ''}
          onChange={handleChange('imageUrl')}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetImage}
          >
            Supprimer l'image
          </Button>
        </div>
        <Input
          placeholder="Texte alternatif"
          value={value.imageAlt ?? ''}
          onChange={handleChange('imageAlt')}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Afficher le logo</Label>
          <Switch
            checked={isLogoEnabled}
            onCheckedChange={handleBoolean('showLogo')}
          />
        </div>
        {isLogoEnabled && (
          <div className="space-y-2">
            <Input
              placeholder="URL du logo"
              value={value.logoUrl ?? ''}
              onChange={handleChange('logoUrl')}
            />
            <Input
              placeholder="Texte alternatif du logo"
              value={value.logoAlt ?? ''}
              onChange={handleChange('logoAlt')}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalQuoteImageLayoutEditor;
