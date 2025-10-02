import React, { useState } from 'react';
import { Download, LinkIcon, RefreshCcw, Save, Share2, Undo2, Redo2, Copy, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AutosaveBadge = ({ autosaveState, isSaving }) => {
  if (isSaving || autosaveState === 'saving') {
    return <span className="text-xs text-primary">Enregistrement…</span>;
  }
  if (autosaveState === 'error') {
    return <span className="text-xs text-destructive">Erreur d'enregistrement</span>;
  }
  return <span className="text-xs text-muted-foreground/70">Sauvegarde automatique active</span>;
};

const BlueprintBuilderHeader = ({
  blueprint,
  autosaveState,
  isSaving,
  canUndo,
  canRedo,
  onTitleChange,
  onSave,
  onUndo,
  onRedo,
  onDuplicate,
  onShare,
  onSnapshot,
  onExportJson,
  onExportPng,
  onExportSvg,
}) => {
  const [shareStatus, setShareStatus] = useState(null);

  const handleShare = async () => {
    try {
      const token = await onShare?.();
      if (!token) return;
      const url = `${window.location.origin}/blueprint-share/${token}`;
      await navigator.clipboard.writeText(url);
      setShareStatus('Lien copié');
      setTimeout(() => setShareStatus(null), 2500);
    } catch (error) {
      console.error(error);
      setShareStatus('Impossible de copier');
      setTimeout(() => setShareStatus(null), 2500);
    }
  };

  const handleSnapshot = async () => {
    await onSnapshot?.({ label: `Snapshot ${new Date().toLocaleString('fr-FR')}` });
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
        <AutosaveBadge autosaveState={autosaveState} isSaving={isSaving} />
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
          <TooltipContent>Rétablir</TooltipContent>
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
          <TooltipContent>Créer un instantané JSON</TooltipContent>
        </Tooltip>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <RefreshCcw className="mr-1.5 h-4 w-4" />
          Dupliquer
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Partager
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Générer un lien lecture seule
          </TooltipContent>
        </Tooltip>
        {shareStatus && (
          <span className="text-xs text-primary">{shareStatus}</span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={onExportJson}>
              <Download className="mr-1.5 h-4 w-4" />
              JSON
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter la structure au format JSON</TooltipContent>
        </Tooltip>
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
