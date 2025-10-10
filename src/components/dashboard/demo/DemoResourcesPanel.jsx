import React from "react";
import { FolderOpen, Download, Star, ExternalLink } from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ratingStars = (rating) =>
  Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={index}
      className={`h-3.5 w-3.5 ${
        index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
      }`}
    />
  ));

const DemoResourcesPanel = ({ data, onAction }) => {
  const resources = data?.items ?? [];

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Ressources partagees"
          Icon={FolderOpen}
          variant="slate"
          iconClassName="text-indigo-500"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction?.("ouvrir la bibliotheque")}
            >
              Ouvrir la bibliotheque
            </Button>
          }
        />

        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-lg border border-border/60 bg-background/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{resource.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{resource.type}</Badge>
                    <Badge variant="outline">{resource.format}</Badge>
                    <span className="text-muted-foreground/80">
                      {resource.category}
                    </span>
                    <span>•</span>
                    <span>MAJ {resource.lastUpdated}</span>
                    <span>•</span>
                    <span>{resource.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  {ratingStars(resource.rating ?? 0)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Download className="h-4 w-4" />
                  Telechargements illimites dans la demo
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction?.("ouvrir une ressource")}
                >
                  Voir
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {resources.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Aucune ressource n est associee a cette demo pour le moment.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoResourcesPanel;

