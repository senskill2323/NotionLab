import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SketchPicker } from 'react-color';
import { Loader2 } from 'lucide-react';
import ImageUpload from '@/components/ui/image-upload';
import { cn } from '@/lib/utils';
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

const PersonalQuoteImageLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const handleBoolean = createBooleanToggleHandler(value, onChange);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const useDefaultBackground = value.useDefaultBackground !== false;
  const backgroundMode =
    value.backgroundMode === 'solid' || value.backgroundMode === 'gradient'
      ? value.backgroundMode
      : 'gradient';

  const solidColorValue =
    value.solidColor || value.backgroundColor || DEFAULT_SOLID;
  const gradientValue =
    value.gradient || value.backgroundGradient || DEFAULT_GRADIENT;

  const isLogoEnabled = useMemo(
    () => (value.showLogo === undefined ? true : Boolean(value.showLogo)),
    [value.showLogo],
  );

  const updateState = (patch) =>
    onChange((current = {}) => ({
      ...(current ?? {}),
      ...patch,
    }));

  const updateImageUrl = (nextUrl) => {
    updateState({ imageUrl: nextUrl });
    setUploadStatus('idle');
  };

  const resetImage = () => updateImageUrl('');

  const handleUploadStart = () => setUploadStatus('uploading');
  const handleUploadSuccess = () => setUploadStatus('idle');
  const handleUploadError = () => setUploadStatus('error');

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

  const handleGradientPreset = (gradient) => {
    updateState({ gradient, backgroundGradient: gradient });
  };

  const handleGradientInputChange = (event) => {
    const nextValue = event?.target?.value ?? '';
    updateState({ gradient: nextValue, backgroundGradient: nextValue });
  };

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
