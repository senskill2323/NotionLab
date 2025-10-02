import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Database, Zap, Plug } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const BLUEPRINT_PALETTE = [
  {
    id: 'databases',
    label: 'Bases de données',
    icon: Database,
    subfamilies: [
      {
        id: 'db_tasks',
        label: 'Tâches',
        items: [
          {
            id: 'db_tasks_board',
            label: 'Base Tâches',
            description: 'Kanban avec statut, priorité et assignation.',
            family: 'Bases de données',
            subfamily: 'Tâches',
            elementKey: 'database_tasks',
            radius: 120,
            fields: {
              properties: ['Titre', 'Statut', 'Responsable', 'Échéance'],
            },
          },
          {
            id: 'db_tasks_templates',
            label: 'Templates de tâches',
            description: 'Structure pour capitaliser les checklists prêtes à l’emploi.',
            family: 'Bases de données',
            subfamily: 'Tâches',
            elementKey: 'database_task_templates',
            radius: 120,
            fields: {
              properties: ['Nom', 'Processus', 'Checklist'],
            },
          },
        ],
      },
      {
        id: 'db_clients',
        label: 'Clients',
        items: [
          {
            id: 'db_clients_crm',
            label: 'CRM simplifié',
            description: 'Suivi des clients avec statut et historique.',
            family: 'Bases de données',
            subfamily: 'Clients',
            elementKey: 'database_clients',
            radius: 130,
            fields: {
              properties: ['Client', 'Statut', 'Dernière action', 'Responsable'],
            },
          },
          {
            id: 'db_clients_portal',
            label: 'Portail client',
            description: 'Table pour configurer pages et accès dédiés.',
            family: 'Bases de données',
            subfamily: 'Clients',
            elementKey: 'database_client_portal',
            radius: 125,
            fields: {
              properties: ['Client', 'URL', 'Modules', 'Notes'],
            },
          },
        ],
      },
      {
        id: 'db_products',
        label: 'Produits / offres',
        items: [
          {
            id: 'db_products_catalog',
            label: 'Catalogue Produits',
            description: 'Référentiel des offres, livrables et processus.',
            family: 'Bases de données',
            subfamily: 'Produits',
            elementKey: 'database_products',
            radius: 130,
            fields: {
              properties: ['Nom', 'Type', 'Livrables', 'Canal'],
            },
          },
          {
            id: 'db_products_assets',
            label: 'Assets Notion',
            description: 'Modèles, pages, blocs réutilisables.',
            family: 'Bases de données',
            subfamily: 'Produits',
            elementKey: 'database_assets',
            radius: 120,
            fields: {
              properties: ['Type', 'URL', 'Usage', 'Tags'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'automations',
    label: 'Automatisations',
    icon: Zap,
    subfamilies: [
      {
        id: 'auto_whatsapp',
        label: 'WhatsApp',
        items: [
          {
            id: 'auto_whatsapp_followup',
            label: 'Relance WhatsApp',
            description: 'Envoie des messages personnalisés selon statut.',
            family: 'Automatisations',
            subfamily: 'WhatsApp',
            elementKey: 'automation_whatsapp_followup',
            radius: 115,
            fields: {
              trigger: 'Changement de statut client',
              action: 'Message WhatsApp via Make',
            },
          },
        ],
      },
      {
        id: 'auto_email',
        label: 'Email',
        items: [
          {
            id: 'auto_email_onboarding',
            label: 'Onboarding Email',
            description: 'Séquence email déclenchée à la signature.',
            family: 'Automatisations',
            subfamily: 'Email',
            elementKey: 'automation_email_onboarding',
            radius: 115,
            fields: {
              trigger: 'Nouvelle entrée CRM',
              action: 'Séquence Email',
            },
          },
          {
            id: 'auto_email_digest',
            label: 'Digest hebdo',
            description: 'Résumé automatique des activités clés.',
            family: 'Automatisations',
            subfamily: 'Email',
            elementKey: 'automation_email_digest',
            radius: 115,
            fields: {
              trigger: 'Chaque vendredi',
              action: 'Synthèse vers équipe',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    icon: Plug,
    subfamilies: [
      {
        id: 'int_webhook',
        label: 'Webhook',
        items: [
          {
            id: 'int_webhook_ingest',
            label: 'Webhook entrants',
            description: 'Centralise données externes vers Notion.',
            family: 'Intégrations',
            subfamily: 'Webhook',
            elementKey: 'integration_webhook_collect',
            radius: 120,
            fields: {
              target: 'Edge Function / Make',
            },
          },
        ],
      },
      {
        id: 'int_n8n',
        label: 'n8n',
        items: [
          {
            id: 'int_n8n_sync',
            label: 'Sync n8n',
            description: 'Relie Notion et outils externes via n8n.',
            family: 'Intégrations',
            subfamily: 'n8n',
            elementKey: 'integration_n8n_sync',
            radius: 125,
            fields: {
              nodes: ['HTTP', 'Notion', 'Delay', 'Email'],
            },
          },
        ],
      },
    ],
  },
];

export const getDefaultBlueprintPalette = () => BLUEPRINT_PALETTE;

const PaletteItem = ({ item }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: 0.5,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group rounded-lg border border-border/60 bg-card/80 px-3 py-2 transition-colors hover:border-primary hover:bg-primary/10',
        isDragging && 'ring-2 ring-primary'
      )}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground/90">{item.label}</p>
        <span className="text-xs text-muted-foreground">{item.family}</span>
      </div>
      {item.description && (
        <p className="mt-1 text-xs text-muted-foreground/90">{item.description}</p>
      )}
    </div>
  );
};

const PaletteSection = ({ family, filteredItems }) => {
  const Icon = family.icon ?? Database;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground/90">{family.label}</h3>
      </div>
      <div className="space-y-4">
        {family.subfamilies.map((subfamily) => {
          const items = filteredItems[subfamily.id] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={subfamily.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {subfamily.label}
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <PaletteItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BlueprintPalette = ({ searchTerm, onSearchChange, catalog }) => {
  const normalizedSearch = (searchTerm ?? '').trim().toLowerCase();

  const filteredSections = useMemo(() => {
    const source = catalog ?? BLUEPRINT_PALETTE;
    return source.map((family) => {
      const subfamilyMap = {};
      family.subfamilies.forEach((subfamily) => {
        const items = subfamily.items.filter((item) => {
          if (!normalizedSearch) return true;
          return [item.label, item.description, family.label, subfamily.label]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        });
        if (items.length > 0) {
          subfamilyMap[subfamily.id] = items;
        }
      });
      return {
        family,
        filteredItems: subfamilyMap,
        hasItems: Object.keys(subfamilyMap).length > 0,
      };
    }).filter((entry) => entry.hasItems);
  }, [catalog, normalizedSearch]);

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto border-r border-border/70 bg-muted/20 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Palette</p>
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="h-9"
        />
      </div>
      <div className="space-y-6">
        {filteredSections.map(({ family, filteredItems }) => (
          <PaletteSection key={family.id} family={family} filteredItems={filteredItems} />
        ))}
        {filteredSections.length === 0 && (
          <p className="text-xs text-muted-foreground/80">
            Aucun élément ne correspond à la recherche.
          </p>
        )}
      </div>
    </aside>
  );
};

export default BlueprintPalette;


