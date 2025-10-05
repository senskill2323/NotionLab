import React, { useEffect, useState } from 'react';
import { Copy, FileJson, LinkIcon, Loader2, RefreshCcw, Save, Share2, Sparkles, Trash2, Undo2, Redo2 } from 'lucide-react';
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
    return <span className="text-xs text-primary">Enregistrement...</span>;
  }
  if (autosaveState === 'error') {
    return <span className="text-xs text-destructive">Erreur d'enregistrement</span>;
  }
  if (autosaveState === 'conflict') {
    return <span className="text-xs text-destructive">Conflit de versions</span>;
  }
  if (lastSavedAt) {
    return (
      <span className="text-xs text-muted-foreground/70">
        Enregistre {formatDistanceToNow(lastSavedAt, { addSuffix: true, locale: fr })}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground/70">Sauvegarde automatique active</span>;
};

const BlueprintBuilderHeader = ({
  blueprint,
  autosaveState,
  isSaving,
  isAutosaveBusy,
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
  isShareLoading = false,
  onExportJson,
  onExportPng,
  onExportSvg,
  onResolveConflict,
}) => {
  const isConflict = autosaveState === 'conflict';

  const handleSnapshot = async () => {
    await onSnapshot?.({ label: `Snapshot ${new Date().toLocaleString('fr-FR')}` });
  };

  const handleShare = async () => {
    if (isShareLoading) return;
    await onShare?.();
  };

  const handleExportJson = () => {
    onExportJson?.();
  };

  return (
    <header className="border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3">
        {isConflict && (
          <div className="flex items-center justify-between rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-destructive">
            <div className="flex items-center gap-2 text-xs font-medium">
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Ce blueprint a ete modifie ailleurs. Rechargez pour continuer.</span>
            </div>
            <Button size="sm" variant="destructive" onClick={onResolveConflict} disabled={!onResolveConflict}>
              Recharger
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
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
              <TooltipContent>Retablir</TooltipContent>
            </Tooltip>
            <Button size="sm" variant="outline" onClick={onSave} disabled={isSaving || isConflict || isAutosaveBusy}>
              <Save className="mr-1.5 h-4 w-4" />
              Sauvegarder
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleSnapshot} disabled={isConflict}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Snapshot
                </Button>
              </TooltipTrigger>
              <TooltipContent>Creer un instantane JSON</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              disabled={isConflict || isShareLoading}
            >
              {isShareLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-1.5 h-4 w-4" />
              )}
              {isShareLoading ? 'Génération...' : 'Partager'}
            </Button>
            <Button size="sm" variant="outline" onClick={onDuplicate} disabled={isConflict}>
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              Dupliquer
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleExportJson} disabled={isConflict}>
                  <FileJson className="mr-1.5 h-4 w-4" />
                  Export JSON
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exporter le blueprint en JSON</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isConflict}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce blueprint ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irreversible. Le blueprint et son contenu seront definitivement supprimes.
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
                <Button size="icon" variant="ghost" onClick={onExportPng} disabled={isConflict}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exporter en PNG</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={onExportSvg} disabled={isConflict}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exporter en SVG</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BlueprintBuilderHeader;
