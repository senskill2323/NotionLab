import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ThemeActions } from './ThemeActions';

export const ThemeLibrary = ({
  activeTheme,
  draftThemes,
  selectedTheme,
  onSelectTheme,
  onNewTheme,
  onDuplicateTheme,
  onDeleteTheme,
  onSetActiveTheme,
  isSaving,
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Bibliothèque</h2>
        <Button onClick={onNewTheme} size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Nouveau</Button>
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Thème Actif</h3>
          {activeTheme && (
            <div
              className={`p-2 rounded-lg cursor-pointer transition-colors ${selectedTheme?.id === activeTheme.id ? 'bg-primary/20' : 'hover:bg-muted/50'}`}
              onClick={() => onSelectTheme(activeTheme)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{activeTheme.name}</span>
                <ThemeActions theme={activeTheme} onDuplicate={onDuplicateTheme} onDelete={onDeleteTheme} />
              </div>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Thèmes en Brouillon</h3>
          <div className="space-y-2">
            {draftThemes.map(theme => (
              <div
                key={theme.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${selectedTheme?.id === theme.id ? 'bg-primary/20' : 'hover:bg-muted/50'}`}
                onClick={() => onSelectTheme(theme)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{theme.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSetActiveTheme(theme.id); }} disabled={isSaving}>Activer</Button>
                    <ThemeActions theme={theme} onDuplicate={onDuplicateTheme} onDelete={onDeleteTheme} />
                  </div>
                </div>
              </div>
            ))}
            {draftThemes.length === 0 && (
                <p className="text-sm text-muted-foreground italic p-2">Aucun brouillon. Créez-en un nouveau ou dupliquez le thème actif.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};