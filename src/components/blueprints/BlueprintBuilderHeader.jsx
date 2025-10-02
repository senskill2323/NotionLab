import React, { useEffect, useState } from 'react';
import { LinkIcon, RefreshCcw, Save, Undo2, Redo2, Copy, Sparkles, Trash2, Share2, FileJson } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const AutosaveBadge = ({ autosaveState, isSaving, lastSavedAt }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 12000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  if (isSaving || autosaveState === 'saving') {
    return <span className="text-xs text-primary">Enregistrement…</span>;
  }
  if (autosaveState === 'error') {
    return <span className="text-xs text-destructive">Erreur d’enregistrement</span>;
  }
  if (lastSavedAt) {
    return (
      <span className="text-xs text-muted-foreground/70">
        Enregistré {formatDistanceToNow(lastSavedAt, { addSuffix: true, locale: fr })}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground/70">Sauvegarde automatique active</span>;
};

const BlueprintBuilderHeader = ({
  blueprint,
  autosaveState,
  isSaving,
  lastSavedAt,
  canUndo,
  canRedo,
  onTitleChange,
  onSave,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onSnapshot,
  onShare,
  onExportJson,
  onExportPng,
  onExportSvg,
}) => {
  

  const handleSnapshot = async () => {
    await onSnapshot?.({ label: `Snapshot ${new Date().toLocaleString('fr-FR')}` });
  };

  const handleShare = async () => {
    await onShare?.();
  };

  const handleExportJson = () => {
    onExportJson?.();
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <Input
          value={blueprint?.title ?? ''}
          onChange={(event) => onTitleChange?.(event.target.value)}
          placeholder="Nom du blueprint"
          className="h-9 w-72"
        />
        <AutosaveBadge autosaveState={autosaveState} isSaving={isSaving} lastSavedAt={lastSavedAt} />
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Annuler</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>R�tablir</TooltipContent>
        </Tooltip>
        <Button size="sm" variant="outline" onClick={onSave} disabled={isSaving}>
          <Save className="mr-1.5 h-4 w-4" />
          Sauvegarder
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={handleSnapshot}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Snapshot
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cr�er un instantan� JSON</TooltipContent>
        </Tooltip>
        <Button size="sm" variant="outline" onClick={handleShare}>
          <Share2 className="mr-1.5 h-4 w-4" />
          Partager
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Dupliquer
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={handleExportJson}>
              <FileJson className="mr-1.5 h-4 w-4" />
              Export JSON
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter le blueprint en JSON</TooltipContent>
        </Tooltip>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Trash2 className="mr-1.5 h-4 w-4" />
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce blueprint ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irr�versible. Le blueprint et son contenu seront d�finitivement supprim�s.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onExportPng}>
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter en PNG</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onExportSvg}>
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter en SVG</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};

export default BlueprintBuilderHeader;

