import { ArrowDownRight, ArrowUpRight, Gauge } from "lucide-react";
import type { LayoutStats, MetricDef } from "../lib/types";
import { fixed, pct } from "../lib/format";
import { cn } from "@/lib/utils";
import FingerLoad from "./FingerLoad";

export function statValue(stats: LayoutStats, id: string): number {
  return (stats as unknown as Record<string, number>)[id] ?? 0;
}

export function formatStat(value: number, unit: string): string {
  switch (unit) {
    case "%":
      return pct(value);
    case "WPM":
      return fixed(value, 1);
    case "ms":
      return fixed(value, 0);
    case "mm/char":
      return fixed(value, 2);
    default:
      return fixed(value, 2);
  }
}

interface Props {
  stats: LayoutStats;
  metrics: MetricDef[];
  baseline?: LayoutStats;
  onExplain: (id: string) => void;
}

export default function StatPanel({ stats, metrics, baseline, onExplain }: Props) {
  const primary = metrics.find((m) => m.primary)!;
  const rest = metrics.filter((m) => !m.primary);
  const wpm = statValue(stats, primary.id);
  const baseWpm = baseline ? statValue(baseline, primary.id) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* headline gauge */}
      <button
        onClick={() => onExplain(primary.id)}
        className="group relative overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 text-left transition-all hover:border-primary/50"
      >
        <div className="absolute -right-6 -top-6 opacity-10">
          <Gauge className="size-28 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {primary.name}
        </div>
        <div className="mt-1 font-display text-6xl font-bold leading-none text-primary text-glow tabular-nums">
          {formatStat(wpm, primary.unit)}
          <span className="ml-2 align-baseline text-lg font-medium text-muted-foreground">
            {primary.unit}
          </span>
        </div>
        {baseWpm !== undefined && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 text-xs",
              wpm >= baseWpm ? "text-good" : "text-bad",
            )}
          >
            {wpm >= baseWpm ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {wpm >= baseWpm ? "+" : ""}
            {fixed(wpm - baseWpm, 1)} WPM vs QWERTY (
            {pct((wpm - baseWpm) / baseWpm)})
          </div>
        )}
      </button>

      {/* metric grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {rest.map((m) => {
          const v = statValue(stats, m.id);
          const bv = baseline ? statValue(baseline, m.id) : undefined;
          let trend: "good" | "bad" | "" = "";
          if (bv !== undefined && Math.abs(v - bv) > 1e-9) {
            const better = m.better === "higher" ? v > bv : v < bv;
            trend = better ? "good" : "bad";
          }
          return (
            <button
              key={m.id}
              onClick={() => onExplain(m.id)}
              className="rounded-lg border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {m.name}
              </div>
              <div className="mt-0.5 font-display text-2xl tabular-nums">
                {formatStat(v, m.unit)}
              </div>
              {bv !== undefined && (
                <div
                  className={cn(
                    "text-[11px] tabular-nums",
                    trend === "good" && "text-good",
                    trend === "bad" && "text-bad",
                    trend === "" && "text-muted-foreground",
                  )}
                >
                  {v >= bv ? "+" : ""}
                  {formatStat(v - bv, m.unit === "%" ? "%" : m.unit)}
                </div>
              )}
              <div className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {m.short}
              </div>
            </button>
          );
        })}
      </div>

      <FingerLoad stats={stats} />
    </div>
  );
}
