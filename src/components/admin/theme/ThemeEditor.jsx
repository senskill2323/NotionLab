import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { SketchPicker } from 'react-color';
import { Palette, Info, Edit, Check, X } from 'lucide-react';

export const ThemeEditor = ({ theme, onUpdateTheme, translations }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (theme) {
      setTempName(theme.name);
    }
    setIsEditingName(false);
  }, [theme]);

  if (!theme) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20 rounded-lg">
        <Palette className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Aucun thème sélectionné</h3>
        <p className="text-muted-foreground mt-2">Sélectionnez un thème dans la liste de gauche pour commencer à l'éditer, ou créez-en un nouveau.</p>
      </div>
    );
  }

  const handleColorChange = (color, path) => {
    const keys = path.split('.');
    const newTokens = JSON.parse(JSON.stringify(theme.tokens));
    let current = newTokens;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = `hsl(${Math.round(color.hsl.h)}, ${Math.round(color.hsl.s * 100)}%, ${Math.round(color.hsl.l * 100)}%)`;
    onUpdateTheme({ tokens: newTokens });
  };

  const handleDescriptionChange = (key, value) => {
    const newTokens = JSON.parse(JSON.stringify(theme.tokens));
    if (!newTokens.descriptions) newTokens.descriptions = {};
    newTokens.descriptions[key] = value;
    onUpdateTheme({ tokens: newTokens });
  };

  const handleSaveName = () => {
    onUpdateTheme({ name: tempName });
    setIsEditingName(false);
  };
  
  const currentTranslations = { ...translations };
  if(theme.tokens.descriptions){
      Object.keys(theme.tokens.descriptions).forEach(key => {
          if(currentTranslations[key]){
            currentTranslations[key].description = theme.tokens.descriptions[key];
          }
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <>
            <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-lg font-semibold h-9" />
            <Button size="icon" variant="ghost" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}><X className="h-4 w-4" /></Button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">{theme.name}</h3>
            <Button size="icon" variant="ghost" onClick={() => { setTempName(theme.name); setIsEditingName(true); }}><Edit className="h-4 w-4" /></Button>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        {Object.entries(theme.tokens.colors).map(([key, value]) => {
          const translation = currentTranslations[key] || { label: key.replace(/-/g, ' '), description: 'Pas de description.' };
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium capitalize">{translation.label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Légende pour "{translation.label}"</h4>
                        <p className="text-sm text-muted-foreground">Modifiez la description pour cette couleur.</p>
                      </div>
                      <Textarea
                        defaultValue={translation.description}
                        onChange={(e) => handleDescriptionChange(key, e.target.value)}
                        className="min-h-[100px]"
                        rows={5}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="relative">
                <SketchPicker
                  color={value}
                  onChangeComplete={(color) => handleColorChange(color, `colors.${key}`)}
                  presetColors={[]}
                  width="100%"
                  className="!bg-card !shadow-lg"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};