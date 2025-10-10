import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SketchPicker } from "react-color";
import { cn } from "@/lib/utils";
import { createInputChangeHandler } from "./shared";

const gradientPresets = [
  "linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
  "linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #facc15 0%, #f97316 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
];

const DEFAULT_SOLID = "#4f46e5";

const FormationsLayoutEditor = ({ value = {}, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);
  const cta = value.cta ?? {};
  const ctaEnabled = cta.enabled !== false;
  const backgroundMode =
    cta.backgroundMode === "solid" || cta.backgroundMode === "gradient"
      ? cta.backgroundMode
      : "gradient";

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
      event && typeof event === "object" && "target" in event
        ? event.target.value
        : event;
    updateCta({ [field]: nextValue ?? "" });
  };

  const handleCtaToggle = (checked) => updateCta({ enabled: Boolean(checked) });

  const handleModeChange = (mode) => {
    if (!mode) return;
    const patch = { backgroundMode: mode };
    if (mode === "solid" && !cta.solidColor) {
      patch.solidColor = DEFAULT_SOLID;
    }
    if (mode === "gradient" && !cta.gradient) {
      patch.gradient = gradientPresets[0];
    }
    updateCta(patch);
  };

  const handleSolidColorChange = (color) => {
    updateCta({ solidColor: color.hex });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Titre</Label>
          <Input value={value.title ?? ""} onChange={handleChange("title")} />
        </div>
        <div>
          <Label>Suffixe</Label>
          <Input
            value={value.titleSuffix ?? ""}
            onChange={handleChange("titleSuffix")}
          />
        </div>
        <div>
          <Label>Sous titre</Label>
          <Textarea
            rows={4}
            value={value.subtitle ?? ""}
            onChange={handleChange("subtitle")}
          />
        </div>
        <div>
          <Label>Image de fond</Label>
          <Input
            value={value.backgroundImageUrl ?? ""}
            onChange={handleChange("backgroundImageUrl")}
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
                    Controle l'affichage du call to action sous les cartes de formation.
                  </p>
                </div>
                <Switch checked={ctaEnabled} onCheckedChange={handleCtaToggle} />
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Texte principal</Label>
                    <Textarea
                      rows={3}
                      value={cta.headline ?? ""}
                      onChange={handleCtaInput("headline")}
                      disabled={!ctaEnabled}
                    />
                  </div>
                  <div>
                    <Label>Texte du bouton</Label>
                    <Input
                      value={cta.buttonLabel ?? ""}
                      onChange={handleCtaInput("buttonLabel")}
                      disabled={!ctaEnabled}
                    />
                  </div>
                  <div>
                    <Label>Lien du bouton</Label>
                    <Input
                      value={cta.buttonLink ?? ""}
                      onChange={handleCtaInput("buttonLink")}
                      disabled={!ctaEnabled}
                      placeholder="/inscription"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <Label>Style de fond</Label>
                    <ToggleGroup
                      type="single"
                      value={backgroundMode}
                      onValueChange={(mode) => ctaEnabled && handleModeChange(mode)}
                      className="w-full md:w-auto"
                    >
                      <ToggleGroupItem value="solid" disabled={!ctaEnabled} className="px-4">
                        Couleur unique
                      </ToggleGroupItem>
                      <ToggleGroupItem value="gradient" disabled={!ctaEnabled} className="px-4">
                        Degrade
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {backgroundMode === "solid" ? (
                    <div className="space-y-2">
                      <Label>Couleur</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!ctaEnabled}
                            className="w-full justify-start gap-3"
                          >
                            <span
                              className="h-5 w-5 rounded-md border"
                              style={{ background: cta.solidColor ?? DEFAULT_SOLID }}
                            />
                            <span className="text-xs text-muted-foreground">
                              Choisir une couleur
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <SketchPicker
                            disableAlpha
                            color={cta.solidColor ?? DEFAULT_SOLID}
                            onChangeComplete={handleSolidColorChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={cta.solidColor ?? DEFAULT_SOLID}
                        onChange={handleCtaInput("solidColor")}
                        placeholder={DEFAULT_SOLID}
                        disabled={!ctaEnabled}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Utilisez le selecteur pour choisir une couleur precise.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Selection du degrade</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {gradientPresets.map((gradient) => (
                          <Button
                            key={gradient}
                            type="button"
                            variant="outline"
                            disabled={!ctaEnabled}
                            onClick={() => updateCta({ gradient })}
                            className={cn(
                              "h-16 rounded-lg border-2 border-transparent transition hover:scale-[1.02]",
                              cta.gradient === gradient && "border-primary shadow-md",
                            )}
                            style={{ backgroundImage: gradient }}
                          />
                        ))}
                      </div>
                      <Input
                        value={cta.gradient ?? ""}
                        onChange={handleCtaInput("gradient")}
                        disabled={!ctaEnabled}
                        placeholder="linear-gradient(...)"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Selectionnez un degrade ou collez votre propre valeur CSS.
                      </p>
                    </div>
                  )}
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
