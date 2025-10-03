import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FieldGroup = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-muted-foreground/90">{label}</Label>
    {children}
  </div>
);

const BlueprintInspector = ({
  node,
  onUpdate,
  onDelete,
}) => {
  if (!node) {
    return (
      <aside className="flex h-full flex-col justify-center border-l border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        Sélectionnez une bulle pour ajuster ses propriétés.
      </aside>
    );
  }

  const isRoot = node.data?.elementKey === 'root';
  const fields = node.data?.fields ?? {};

  return (
    <aside className="flex h-full flex-col gap-4 border-l border-border/70 bg-card/70 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Propriétés</p>
        <p className="text-xs text-muted-foreground/80">
          {isRoot ? 'Nœud central du blueprint.' : 'Bulle du blueprint.'}
        </p>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2">
        <FieldGroup label="Titre">
          <Input
            value={node.data?.title ?? ''}
            onChange={(event) => onUpdate(node.id, { title: event.target.value })}
            placeholder={isRoot ? 'Nom du projet' : 'Nom de la bulle'}
          />
        </FieldGroup>

        {!isRoot && (
          <div className="grid grid-cols-1 gap-3">
            <FieldGroup label="Famille">
              <Input
                value={node.data?.family ?? ''}
                onChange={(event) => onUpdate(node.id, { family: event.target.value })}
                placeholder="Catégorie (ex. Bases de données)"
              />
            </FieldGroup>
            <FieldGroup label="Sous-famille">
              <Input
                value={node.data?.subfamily ?? ''}
                onChange={(event) => onUpdate(node.id, { subfamily: event.target.value })}
                placeholder="Sous-catégorie"
              />
            </FieldGroup>
            <FieldGroup label="Notes clés">
              <Textarea
                className="min-h-[90px]"
                value={fields.notes ?? ''}
                onChange={(event) => onUpdate(node.id, {
                  fields: { ...fields, notes: event.target.value },
                })}
                placeholder="Décrivez la valeur, les livrables ou les prérequis"
              />
            </FieldGroup>
          </div>
        )}

        {isRoot && (
          <div className="grid grid-cols-1 gap-3">
            <FieldGroup label="Objectif">
              <Textarea
                className="min-h-[80px]"
                value={fields.objectif ?? ''}
                onChange={(event) => onUpdate(node.id, {
                  fields: { ...fields, objectif: event.target.value },
                })}
                placeholder="Quel est l'objectif principal du blueprint ?"
              />
            </FieldGroup>
            <FieldGroup label="Contexte">
              <Textarea
                className="min-h-[80px]"
                value={fields.contexte ?? ''}
                onChange={(event) => onUpdate(node.id, {
                  fields: { ...fields, contexte: event.target.value },
                })}
                placeholder="Contexte ou périmètre du projet"
              />
            </FieldGroup>
          </div>
        )}
      </div>

      {!isRoot && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground/80">Supprimer la bulle sélectionnée.</p>
          <Button size="sm" variant="destructive" onClick={() => onDelete?.(node.id)}>
            Supprimer
          </Button>
        </div>
      )}
    </aside>
  );
};

export default BlueprintInspector;

