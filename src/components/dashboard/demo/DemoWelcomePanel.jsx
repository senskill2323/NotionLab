import React from "react";
import { CalendarDays, Home, Sparkles, ArrowRight } from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const formatSessionDate = (isoString) => {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch (error) {
    return "Date a confirmer";
  }
};

const DemoWelcomePanel = ({ user, hero, highlights, quickLinks, onAction }) => {
  const displayName = user?.firstName || user?.defaultPseudo || "NotionLab";

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Accueil"
          Icon={Home}
          variant="slate"
          iconClassName="text-primary"
        />

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
                Lancer le builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction?.("planifier un appel")}
              >
                Planifier un appel
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Prochaine session
            </div>
            <h3 className="text-lg font-semibold leading-tight">
              {hero?.upcomingSession?.title ?? "Session a definir"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatSessionDate(hero?.upcomingSession?.scheduledAt)}
            </p>
            <Badge variant="secondary" className="w-fit text-xs">
              {hero?.upcomingSession?.coach ?? "Coach NotionLab"}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start px-0 text-primary"
              onClick={() => onAction?.("ouvrir le calendrier")}
            >
              Voir les details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {highlights?.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border/50 bg-muted/30 px-3 py-3 shadow-inner"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {quickLinks?.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onAction?.(`utiliser le lien ${link.id}`)}
              className="flex w-full items-start gap-3 rounded-lg border border-dashed border-border/70 bg-background/90 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
            >
              <ArrowRight className="mt-1 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">{link.label}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {link.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoWelcomePanel;

