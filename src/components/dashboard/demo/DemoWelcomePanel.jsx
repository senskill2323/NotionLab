import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DemoKPIPanel from "./DemoKPIPanel";

const DemoWelcomePanel = ({ user, hero, kpis, onAction }) => {
  const displayName = user?.firstName || user?.defaultPseudo || "NotionLab";

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-4 lg:p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Sparkles className="h-4 w-4" />
              Espace client NotionLab
            </div>
            <h2 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight">
              Bonjour {displayName} !
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {hero?.subHeadline ??
                "Pilotez vos formations, ressources et demandes de support depuis un seul espace."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button size="sm" onClick={() => onAction?.("explorer le builder")}>
                Essayer le builder de formation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction?.("Planifier un point avec Yann")}
              >
                Planifier un point avec Yann
              </Button>
            </div>
          </div>

          <DemoKPIPanel data={kpis} onAction={onAction} />
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoWelcomePanel;
