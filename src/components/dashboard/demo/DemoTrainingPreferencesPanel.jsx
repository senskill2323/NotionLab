import React from "react";
import {
  ClipboardList,
  CheckCircle2,
  CalendarClock,
  Circle,
} from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusIcon = {
  done: CheckCircle2,
  scheduled: CalendarClock,
  todo: Circle,
};

const statusVariant = {
  done: "default",
  scheduled: "secondary",
  todo: "outline",
};

const DemoTrainingPreferencesPanel = ({ data, onAction }) => {
  const steps = data?.steps ?? [];
  const progress = data?.progress ?? 0;

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-3">
        <ModuleHeader
          title="Onboarding formation"
          Icon={ClipboardList}
          variant="slate"
          iconClassName="text-teal-500"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction?.("modifier les preferences")}
            >
              Modifier mes reponses
            </Button>
          }
        />

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression du brief</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-teal-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {steps.map((step) => {
            const Icon = statusIcon[step.status] ?? Circle;
            const variant = statusVariant[step.status] ?? "outline";

            return (
              <div
                key={step.id}
                className="rounded-lg border border-border/60 bg-background/90 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-teal-500" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={variant} className="text-xs">
                    {step.status === "done" && "Termine"}
                    {step.status === "scheduled" && "Planifie"}
                    {step.status === "todo" && "A faire"}
                  </Badge>
                </div>
              </div>
            );
          })}
          {steps.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-5 text-center text-sm text-muted-foreground">
              Les etapes d onboarding seront affichees ici.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoTrainingPreferencesPanel;

