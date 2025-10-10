import React from "react";
import { Bot, MessageSquare, Download, Lightbulb } from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DemoAssistantPanel = ({ data, onAction }) => {
  const usage = data?.usage ?? {};
  const prompts = data?.prompts ?? [];
  const updates = data?.lastUpdates ?? [];

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="Assistant NotionLab"
          Icon={Bot}
          variant="slate"
          iconClassName="text-purple-500"
          actions={
            <Button
              size="sm"
              onClick={() => onAction?.("demarrer l assistant")}
            >
              Lancer une session
            </Button>
          }
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-purple-50/60 p-4 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Sessions cette semaine
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {usage.sessionsThisWeek ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-purple-50/60 p-4 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Duree moyenne
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {usage.averageDuration ?? "00:00"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-purple-50/60 p-4 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Temps gagne
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {usage.savedTime ?? "0h00"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/90 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            Prompts a essayer
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {prompts.map((prompt, index) => (
              <Button
                key={index}
                variant="ghost"
                className="justify-start px-3 text-left text-sm"
                onClick={() => onAction?.("utiliser un prompt")}
              >
                <Badge variant="secondary" className="mr-2 text-xs">
                  #{index + 1}
                </Badge>
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {updates.map((update) => (
            <div
              key={update.id}
              className="rounded-lg border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-1 h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-semibold">{update.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {update.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAction?.("telecharger l historique assistant")}
        >
          <Download className="mr-2 h-4 w-4" />
          Exporter mes conversations
        </Button>
      </CardContent>
    </Card>
  );
};

export default DemoAssistantPanel;

