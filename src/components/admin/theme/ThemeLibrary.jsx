import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ThemeActions } from './ThemeActions';
import { cn } from '@/lib/utils';

const ThemeEntry = ({ theme, selected, onSelect, children, description }) => (
  <button
    type="button"
    onClick={() => onSelect(theme)}
    className={cn(
      'w-full rounded-md border border-border/40 bg-card/40 p-3 text-left text-sm transition hover:border-primary/40 hover:bg-card/60 focus:outline-none',
      selected && 'ring-1 ring-primary/60 border-primary/50 bg-primary/10'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium truncate">{theme.name}</span>
      {children}
    </div>
    {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
  </button>
);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Bibliotheque</h2>
        <Button onClick={onNewTheme} size="sm" variant="outline" className="h-8 px-3 text-xs">
          <PlusCircle className="mr-1 h-4 w-4" /> Nouveau
        </Button>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Theme actif</h3>
        {activeTheme ? (
          <ThemeEntry
            theme={activeTheme}
            selected={selectedTheme?.id === activeTheme.id}
            onSelect={onSelectTheme}
            description="Actuellement applique a l'application."
          >
            <ThemeActions theme={activeTheme} onDuplicate={onDuplicateTheme} onDelete={onDeleteTheme} compact />
          </ThemeEntry>
        ) : (
          <p className="text-xs text-muted-foreground italic">Aucun theme actif.</p>
        )}
      </section>

      <section className="space-y-2.5">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Themes en brouillon</h3>
        {draftThemes.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucun brouillon. Dupliquez le theme actif ou creez-en un.</p>
        )}
        {draftThemes.map((theme) => (
          <ThemeEntry
            key={theme.id}
            theme={theme}
            selected={selectedTheme?.id === theme.id}
            onSelect={onSelectTheme}
            description="En brouillon"
          >
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                className="h-7 px-2 text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetActiveTheme(theme.id);
                }}
                disabled={isSaving}
              >
                Activer
              </Button>
              <ThemeActions theme={theme} onDuplicate={onDuplicateTheme} onDelete={onDeleteTheme} compact />
            </div>
          </ThemeEntry>
        ))}
      </section>
    </div>
  );
};
