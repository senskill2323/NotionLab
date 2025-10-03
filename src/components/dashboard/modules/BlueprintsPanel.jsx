import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Share2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listBlueprints, createBlueprintShare } from '@/lib/blueprints/blueprintApi';
import { useToast } from '@/components/ui/use-toast';

const BlueprintsPanel = () => {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const data = await listBlueprints();
        if (mounted) {
          setBlueprints(data ?? []);
        }
      } catch (error) {
        console.error(error);
        toast({ title: 'Erreur', description: 'Impossible de charger vos blueprints.', variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleShare = async (id) => {
    try {
      setSharingId(id);
      const token = await createBlueprintShare(id);
      if (!token) return;
      const url = `${window.location.origin}/blueprint-share/${token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Lien copié', description: 'Le lien lecture seule est dans le presse-papiers.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur', description: 'Impossible de générer un lien de partage.', variant: 'destructive' });
    } finally {
      setSharingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Blueprint Notion</CardTitle>
        <CardDescription>Créez et partagez vos cartes mentales Notion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground/90">Blueprints disponibles</p>
            <p className="text-xs text-muted-foreground/80">{blueprints.length} enregistrements</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/blueprint-builder">
              Ouvrir le builder
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          {blueprints.slice(0, 3).map((blueprint) => (
            <div key={blueprint.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground/90">{blueprint.title}</p>
                <p className="text-xs text-muted-foreground/80">
                  Mis à jour le {new Date(blueprint.updated_at ?? blueprint.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleShare(blueprint.id)}
                disabled={sharingId === blueprint.id}
              >
                {sharingId === blueprint.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
          {blueprints.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun blueprint pour l'instant. Cliquez sur "Ouvrir le builder" pour créer votre première carte mentale.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlueprintsPanel;
