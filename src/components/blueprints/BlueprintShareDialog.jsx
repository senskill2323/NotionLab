import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, ExternalLink, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const BlueprintShareDialog = ({ open, onOpenChange, share }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = share?.url ?? '';
  const expiresAt = share?.expiresAt ? new Date(share.expiresAt) : null;
  const blueprintTitle = share?.title ?? '';

  const relativeExpiration = useMemo(() => {
    if (!expiresAt) {
      return 'dans 7 jours';
    }
    try {
      return formatDistanceToNow(expiresAt, { addSuffix: true, locale: fr });
    } catch (error) {
      console.error(error);
      return 'dans 7 jours';
    }
  }, [expiresAt]);

  const absoluteExpiration = useMemo(() => {
    if (!expiresAt) {
      return null;
    }
    try {
      return expiresAt.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [expiresAt]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!shareUrl || typeof navigator === 'undefined' || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenChange = (nextOpen) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setCopied(false);
    }
  };

  const handleOpenLink = () => {
    if (!shareUrl || typeof window === 'undefined') return;
    window.open(shareUrl, '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lien de partage</DialogTitle>
          <DialogDescription>
            {blueprintTitle ? `Lien lecture seule pour « ${blueprintTitle} ». ` : 'Lien lecture seule.'}
            Les partages précédents sont désactivés et chaque lien expire automatiquement au bout de 7 jours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Lien public</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.target.select()}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={handleCopy} disabled={!shareUrl}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            <Timer className="mt-1 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Expiration</p>
              {absoluteExpiration ? (
                <>
                  <p className="text-sm text-foreground">Expire le {absoluteExpiration}</p>
                  <p className="text-xs text-muted-foreground">({relativeExpiration})</p>
                </>
              ) : (
                <p className="text-sm text-foreground">Expire dans 7 jours</p>
              )}
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
            Un nouveau lien remplace automatiquement les précédents pour ce blueprint.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleOpenLink} disabled={!shareUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir
            </Button>
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintShareDialog;
