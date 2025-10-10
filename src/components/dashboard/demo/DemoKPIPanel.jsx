import React from "react";
import {
  Activity,
  Gauge,
  Smile,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import ModuleHeader from "@/components/dashboard/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const colorClasses = {
  blue: {
    container:
      "bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/40 dark:border-blue-800/40",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  },
  green: {
    container:
      "bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/40 dark:border-emerald-800/40",
    icon:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  orange: {
    container:
      "bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/40 dark:border-amber-800/40",
    icon:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  },
  purple: {
    container:
      "bg-gradient-to-br from-violet-50 to-violet-100/40 dark:from-violet-950/20 dark:to-violet-900/10 border-violet-200/40 dark:border-violet-800/40",
    icon:
      "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  },
};

const metricIcon = {
  blue: Activity,
  green: Zap,
  orange: TrendingUp,
  purple: Gauge,
};

const DemoKPIPanel = ({ data, onAction }) => {
  const metrics = data?.metrics ?? [];
  const mood = data?.mood;

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-5 space-y-4">
        <ModuleHeader
          title="KPIs personnels"
          Icon={Target}
          variant="slate"
          iconClassName="text-blue-500"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction?.("exporter mes KPI")}
            >
              Exporter
            </Button>
          }
        />

        <div className="rounded-xl border border-border/60 bg-card/90 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-2xl">
                {mood?.emoji ?? "🙂"}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Mon etat d esprit du moment
                </p>
                <p className="text-xs text-muted-foreground">
                  {mood?.label ?? "Pret pour la prochaine session"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction?.("changer mon humeur")}
            >
              Mettre a jour
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => {
            const palette = colorClasses[metric.color] ?? colorClasses.blue;
            const Icon = metricIcon[metric.color] ?? Activity;

            return (
              <div
                key={metric.id}
                className={`rounded-xl border px-4 py-4 shadow-sm transition hover:shadow-md ${palette.container}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${palette.icon}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {metric.trend !== undefined && (
                    <Badge
                      variant={metric.trend >= 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {metric.trend >= 0 ? "+" : ""}
                      {metric.trend}%
                    </Badge>
                  )}
                </div>
                <p className="mt-4 text-2xl font-semibold">{metric.value}</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoKPIPanel;

