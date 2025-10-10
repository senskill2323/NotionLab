import React from "react";
import { Bot, MessageSquare } from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DemoAssistantPanel = ({ data, onAction }) => {
  const usage = data?.usage ?? {};
  const prompts = data?.prompts ?? [];

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-3">
        <ModuleHeader
          title="Assistant IA vocal"
          Icon={Bot}
          variant="slate"
          iconClassName="text-purple-500"
          actions={
            <Button
              size="sm"
              onClick={() => onAction?.("demarrer l assistant")}
            >
              Lancer une conversation vocale
            </Button>
          }
        />

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-purple-50/60 p-3 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Sessions cette semaine
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {usage.sessionsThisWeek ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-purple-50/60 p-3 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Duree moyenne
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {usage.averageDuration ?? "00:00"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/90 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            Quoi demander vocalement ?
          </div>
          <div className="mt-2 flex flex-col gap-2">
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

      </CardContent>
    </Card>
  );
};

export default DemoAssistantPanel;
