import React from "react";
import { GitBranch, Eye, Plus } from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusVariant = (status) => {
  switch (status) {
    case "Public":
    case "Publie":
      return "default";
    case "Brouillon":
      return "secondary";
    default:
      return "outline";
  }
};

const DemoBlueprintsPanel = ({ data, onAction }) => {
  const blueprints = data?.items ?? [];

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Blueprints disponibles"
          Icon={GitBranch}
          variant="slate"
          iconClassName="text-pink-500"
          actions={
            <Button
              size="sm"
              onClick={() => onAction?.("creer un blueprint")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau blueprint
            </Button>
          }
        />

        <div className="grid gap-3 md:grid-cols-3">
          {blueprints.map((blueprint) => (
            <div
              key={blueprint.id}
              className="rounded-lg border border-border/60 bg-background/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{blueprint.title}</h3>
                <Badge variant={statusVariant(blueprint.status)}>
                  {blueprint.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {blueprint.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>MAJ {blueprint.updatedAt}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => onAction?.("previsualiser un blueprint")}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Apercu
                </Button>
              </div>
            </div>
          ))}
        </div>

        {blueprints.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Aucune maquette blueprint n est associee a cette demo pour le moment.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DemoBlueprintsPanel;

