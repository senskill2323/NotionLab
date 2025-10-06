import React, { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Database, Zap, Plug, ChevronDown } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BLUEPRINT_PALETTE = [
  {
    id: 'family-databases',
    label: 'Bases de donnees',
    description: 'Modeles de bases Notion pour suivre taches, clients et assets.',
    icon: Database,
    items: [
      {
        id: 'item-database-tasks',
        label: 'Base Taches',
        description: "Base de donnees qui regroupe les taches et leurs responsables.",
      },
      {
        id: 'item-database-clients',
        label: 'Base Clients',
        description: "Referentiel des comptes clients avec statut et dernier echange.",
      },
      {
        id: 'item-database-assets',
        label: 'Base Assets',
        description: "Catalogue des assets et ressources Notion a reutiliser.",
      },
    ],
  },
  {
    id: 'family-process',
    label: 'Processus internes',
    description: 'Checklist et suivis pour fluidifier le fonctionnement au quotidien.',
    icon: Plug,
    items: [
      {
        id: 'item-process-onboarding',
        label: 'Checklist Onboarding',
        description: "Checklist pour onboarder un nouveau client etape par etape.",
      },
      {
        id: 'item-process-quality',
        label: 'Suivi Qualite',
        description: "Table simplifiee pour tracer les controles qualite recurrents.",
      },
    ],
  },
  {
    id: 'family-communication',
    label: 'Communication',
    description: 'Plans de communication et briefs prets a dupliquer.',
    icon: Zap,
    items: [
      {
        id: 'item-com-plan-editorial',
        label: 'Plan Editorial',
        description: "Planning editorial multi-canaux avec statut et proprietaire.",
      },
      {
        id: 'item-com-brief-newsletter',
        label: 'Brief Newsletter',
        description: "Fiche recapitulant objectif, audience et contenus dune newsletter.",
      },
    ],
  },
];

export const getDefaultBlueprintPalette = () => BLUEPRINT_PALETTE;

const PaletteItem = ({ item, familyLabel }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      item: {
        ...item,
        family: familyLabel,
      },
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: 0.5,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group rounded-lg border border-border/60 bg-card/80 px-3 py-2 transition-colors hover:border-primary hover:bg-primary/10',
        isDragging && 'ring-2 ring-primary',
      )}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground/90">{item.label}</p>
        <span className="text-xs text-muted-foreground">{familyLabel}</span>
      </div>
      {item.description && (
        <p className="mt-1 text-xs text-muted-foreground/90">{item.description}</p>
      )}
    </div>
  );
};

const PaletteSection = ({ family, items }) => {
  const Icon = family.icon ?? Database;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground/90">{family.label}</h3>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-accent/70"
            aria-label={isOpen ? `Masquer ${family.label}` : `Afficher ${family.label}`}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2 pt-1">
        {family.description && (
          <p className="text-xs text-muted-foreground/80">{family.description}</p>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <PaletteItem key={item.id} item={item} familyLabel={family.label} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const BlueprintPalette = ({ searchTerm, onSearchChange, catalog }) => {
  const normalizedSearch = (searchTerm ?? '').trim().toLowerCase();

  const filteredFamilies = useMemo(() => {
    const source = catalog ?? BLUEPRINT_PALETTE;
    return source
      .map((family) => {
        const items = (family.items ?? []).filter((item) => {
          if (!normalizedSearch) return true;
          return [item.label, item.description, family.label]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        });
        return { family, items };
      })
      .filter((entry) => entry.items.length > 0);
  }, [catalog, normalizedSearch]);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden border-r border-border/70 bg-muted/20 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Palette</p>
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="h-9"
        />
      </div>
      <div className="blueprint-palette-scroll flex-1 space-y-6 overflow-y-auto pr-1">
        {filteredFamilies.map(({ family, items }) => (
          <PaletteSection key={family.id} family={family} items={items} />
        ))}
        {filteredFamilies.length === 0 && (
          <p className="text-xs text-muted-foreground/80">
            Aucun element ne correspond a la recherche.
          </p>
        )}
      </div>
    </aside>
  );
};

export default BlueprintPalette;
