import React from "react";
import { Activity, Gauge, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const colorClasses = {
  blue: {
    container:
      "border-blue-200/60 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-950/10",
    icon: "text-blue-500 dark:text-blue-300",
  },
  green: {
    container:
      "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/10",
    icon: "text-emerald-500 dark:text-emerald-300",
  },
  orange: {
    container:
      "border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/10",
    icon: "text-amber-500 dark:text-amber-300",
  },
  purple: {
    container:
      "border-violet-200/60 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-950/10",
    icon: "text-violet-500 dark:text-violet-300",
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

  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardContent className="p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-blue-500" />
            <span>KPIs personnels</span>
          </div>
          {onAction && (
            <button
              type="button"
              onClick={() => onAction?.("exporter mes KPI")}
              className="text-[0.7rem] font-medium text-primary hover:underline"
            >
              Exporter
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {metrics.map((metric) => {
            const palette = colorClasses[metric.color] ?? colorClasses.blue;
            const Icon = metricIcon[metric.color] ?? Activity;

            return (
              <div
                key={metric.id}
                className={`rounded-md border px-3 py-3 text-left shadow-sm transition hover:shadow-md ${palette.container}`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Icon className={`h-4 w-4 ${palette.icon}`} />
                  {metric.trend !== undefined && (
                    <span className="font-medium text-[0.65rem]">
                      {metric.trend >= 0 ? "+" : ""}
                      {metric.trend}%
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {metric.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.value} · {metric.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoKPIPanel;
