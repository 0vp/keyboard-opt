import type { LayoutStats } from "../lib/types";
import { FINGER_COLORS, FINGER_SHORT, pct } from "../lib/format";

// Show the 8 typing fingers (skip thumbs which carry no alpha load here).
const ORDER = [0, 1, 2, 3, 6, 7, 8, 9];

export default function FingerLoad({ stats }: { stats: LayoutStats }) {
  const max = Math.max(...ORDER.map((i) => stats.finger_load[i]), 1e-6);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Finger load
      </div>
      <div className="flex h-28 items-end gap-2">
        {ORDER.map((i) => {
          const isLeft = i <= 4;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end overflow-hidden rounded-[5px] bg-background">
                <div
                  className="w-full rounded-t-[5px] transition-[height] duration-500"
                  style={{
                    height: `${(stats.finger_load[i] / max) * 100}%`,
                    background: FINGER_COLORS[i],
                  }}
                  title={pct(stats.finger_load[i])}
                />
              </div>
              <div
                className="text-[9px] uppercase"
                style={{ color: isLeft ? "var(--signal-c)" : undefined }}
              >
                {FINGER_SHORT[i]}
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {pct(stats.finger_load[i], 0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
