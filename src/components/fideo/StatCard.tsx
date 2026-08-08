import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  index = 0,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  hint?: string;
  index?: number;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className="card-hover animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="rounded-xl bg-accent p-2 text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-display mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              positive ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta}%
          </span>
        )}
        <span className="text-muted-foreground">{hint ?? "vs semaine précédente"}</span>
      </div>
    </div>
  );
}
