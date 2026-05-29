import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { IndexData } from "../lib/types";
import { fixed, pct, typeColor } from "../lib/format";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

const FEATURED = [
  "qwerty", "dvorak", "colemak", "colemak-dh", "workman", "graphite",
  "canary", "focal", "gallium-v2", "engram", "semimak", "snth",
  "night", "recurva", "northwest", "sturdy-am",
];

interface Props {
  index: IndexData;
  selected: string;
  onSelect: (name: string) => void;
  accent?: "a" | "b";
  title?: string;
  compact?: boolean;
}

export default function LayoutList({
  index,
  selected,
  onSelect,
  accent,
  title,
  compact,
}: Props) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);

  const byName = useMemo(
    () => new Map(index.layouts.map((l) => [l.name, l])),
    [index],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query) {
      return index.layouts
        .filter((l) => l.name.includes(query))
        .sort((a, b) => a.rank - b.rank);
    }
    if (all) return index.layouts.slice().sort((a, b) => a.rank - b.rank);
    return FEATURED.map((n) => byName.get(n)).filter(Boolean) as IndexData["layouts"];
  }, [index, q, all, byName]);

  const accentColor =
    accent === "a" ? "var(--signal)" : accent === "b" ? "var(--signal-b)" : undefined;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-3",
        compact && "max-h-[230px]",
      )}
    >
      {title && (
        <div
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          {title}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-xs"
          placeholder="Search 150 layouts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {!q && (
        <button
          className="mt-2 rounded-md border border-dashed border-border py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          onClick={() => setAll((v) => !v)}
        >
          {all ? "Show featured only" : `Show all ${index.count}`}
        </button>
      )}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        {rows.map((l) => {
          const active = l.name === selected;
          return (
            <button
              key={l.name}
              onClick={() => onSelect(l.name)}
              className={cn(
                "group grid grid-cols-[34px_1fr_10px_46px_44px] items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[13px] transition-colors",
                active
                  ? "border-primary/50 bg-secondary"
                  : "border-transparent hover:bg-secondary/60",
              )}
              style={active && accentColor ? { borderColor: accentColor } : undefined}
            >
              <span className="text-[10px] tabular-nums text-muted-foreground">
                #{l.rank}
              </span>
              <span className="truncate font-medium">{l.name}</span>
              <span
                className="size-2 rounded-[2px]"
                style={{ background: typeColor(l.type) }}
                title={l.type_label}
              />
              <span className="text-right tabular-nums">{fixed(l.wpm, 1)}</span>
              <span className="text-right text-[11px] tabular-nums text-muted-foreground">
                {pct(l.sfb, 1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
