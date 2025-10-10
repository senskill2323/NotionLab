import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { createInputChangeHandler } from './shared';

const FormationsLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const cta = value.cta ?? {};
  const ctaEnabled = cta.enabled !== false;

  const updateCta = (patch) => {
    onChange((current) => ({
      ...(current ?? {}),
      cta: {
        ...(current?.cta ?? {}),
        ...patch,
      },
    }));
  };

  const handleCtaInput = (field) => (event) => {
    const nextValue =
      event && typeof event === 'object' && 'target' in event
        ? event.target.value
        : event;
    updateCta({ [field]: nextValue ?? '' });
  };

  const handleCtaToggle = (checked) => updateCta({ enabled: Boolean(checked) });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Titre</Label>
          <Input value={value.title ?? ''} onChange={handleChange('title')} />
        </div>
        <div>
          <Label>Suffixe</Label>
          <Input
            value={value.titleSuffix ?? ''}
            onChange={handleChange('titleSuffix')}
          />
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
          <Label>Image de fond</Label>
          <Input
            value={value.backgroundImageUrl ?? ''}
            onChange={handleChange('backgroundImageUrl')}
          />
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="cta">
          <AccordionTrigger>Bloc call to action</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm font-medium">Activer le bloc</Label>
                  <p className="text-xs text-muted-foreground">
                    Contr�le l&rsquo;affichage du call to action sous les cartes
                    de formation.
                  </p>
                </div>
                <Switch
                  checked={ctaEnabled}
                  onCheckedChange={handleCtaToggle}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Texte principal</Label>
                  <Textarea
                    rows={3}
                    value={cta.headline ?? ''}
                    onChange={handleCtaInput('headline')}
                    disabled={!ctaEnabled}
                  />
                </div>
                <div>
                  <Label>Texte du bouton</Label>
                  <Input
                    value={cta.buttonLabel ?? ''}
                    onChange={handleCtaInput('buttonLabel')}
                    disabled={!ctaEnabled}
                  />
                </div>
                <div>
                  <Label>Lien du bouton</Label>
                  <Input
                    value={cta.buttonLink ?? ''}
                    onChange={handleCtaInput('buttonLink')}
                    disabled={!ctaEnabled}
                    placeholder="/inscription"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Couleur ou d�grad� de fond</Label>
                  <Input
                    value={cta.backgroundColor ?? ''}
                    onChange={handleCtaInput('backgroundColor')}
                    disabled={!ctaEnabled}
                    placeholder="linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepte une couleur hex (ex: #4f46e5) ou tout background CSS.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FormationsLayoutEditor;
