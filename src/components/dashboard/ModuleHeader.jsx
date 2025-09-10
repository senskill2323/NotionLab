import React from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  slate:
    "from-slate-50 to-slate-25 dark:from-slate-900/30 dark:to-slate-900/10",
  blue:
    "from-blue-50 to-blue-25 dark:from-blue-900/25 dark:to-blue-900/5",
  indigo:
    "from-indigo-50 to-indigo-25 dark:from-indigo-900/25 dark:to-indigo-900/5",
  violet:
    "from-violet-50 to-violet-25 dark:from-violet-900/25 dark:to-violet-900/5",
  amber:
    "from-amber-50 to-amber-25 dark:from-amber-900/25 dark:to-amber-900/5",
  green:
    "from-emerald-50 to-emerald-25 dark:from-emerald-900/25 dark:to-emerald-900/5",
  rose:
    "from-rose-50 to-rose-25 dark:from-rose-900/25 dark:to-rose-900/5",
};

/**
 * ModuleHeader
 * Unified header for dashboard modules (title, icon, actions)
 */
export default function ModuleHeader({
  title,
  Icon,
  actions,
  variant = "slate",
  className,
}) {
  const gradient = variantClasses[variant] || variantClasses.slate;

  return (
    <div
      className={cn(
        "w-full rounded-md border border-border/60 bg-gradient-to-r px-3 py-2 shadow-sm min-h-[48px]",
        gradient,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon ? (
            <Icon className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          ) : (
            <div className="h-8 w-8 shrink-0 rounded-sm bg-primary/20" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight truncate">{title}</h3>
          </div>
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
