import { ArrowRight } from "lucide-react";
import type { LayoutDetail, LayoutStats, MetricDef } from "../lib/types";
import { fixed, pct } from "../lib/format";
import { cn } from "@/lib/utils";
import { formatStat, statValue } from "./StatPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface Props {
  a: LayoutDetail;
  b: LayoutDetail;
  statsA: LayoutStats;
  statsB: LayoutStats;
  metrics: MetricDef[];
  onExplain: (id: string) => void;
}

export default function ComparePanel({
  a,
  b,
  statsA,
  statsB,
  metrics,
  onExplain,
}: Props) {
  const wpm = metrics.find((m) => m.primary)!;
  const wa = statValue(statsA, wpm.id);
  const wb = statValue(statsB, wpm.id);
  const faster = wb >= wa;

  return (
    <div className="flex flex-col gap-4">
      {/* gain headline */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-lg border border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2 font-display text-lg text-signal">
          <span className="size-2.5 rounded-full bg-signal" />
          {a.name}
        </div>
        <div className="text-center">
          <div
            className={cn(
              "font-display text-3xl font-bold tabular-nums",
              faster ? "text-good" : "text-bad",
            )}
          >
            {faster ? "+" : ""}
            {fixed(wb - wa, 1)} WPM
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {b.name} vs {a.name} ({pct((wb - wa) / wa)})
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 font-display text-lg text-signal-b">
          {b.name}
          <span className="size-2.5 rounded-full bg-signal-b" />
        </div>
      </div>

      {/* delta table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-left">Metric</TableHead>
              <TableHead className="text-signal">{a.name}</TableHead>
              <TableHead className="text-signal-b">{b.name}</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  Δ <ArrowRight className="size-3" /> B
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((m) => {
              const va = statValue(statsA, m.id);
              const vb = statValue(statsB, m.id);
              const d = vb - va;
              let cls = "text-muted-foreground";
              if (Math.abs(d) > 1e-9) {
                const better = m.better === "higher" ? d > 0 : d < 0;
                cls = better ? "text-good" : "text-bad";
              }
              return (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => onExplain(m.id)}
                >
                  <TableCell className="text-left">
                    {m.name}{" "}
                    <span className="text-[11px] text-muted-foreground">
                      {m.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-signal">
                    {formatStat(va, m.unit)}
                  </TableCell>
                  <TableCell className="text-signal-b">
                    {formatStat(vb, m.unit)}
                  </TableCell>
                  <TableCell className={cls}>
                    {d >= 0 ? "+" : ""}
                    {formatStat(d, m.unit)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
