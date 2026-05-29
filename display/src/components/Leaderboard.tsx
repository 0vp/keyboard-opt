import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { IndexData, SummaryRow } from "../lib/types";
import { fixed, pct, typeColor } from "../lib/format";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SortKey = keyof Pick<
  SummaryRow,
  | "rank"
  | "wpm"
  | "sfb"
  | "roll_total"
  | "alternation"
  | "pinky_load"
  | "home_row"
  | "travel_mm_per_char"
>;

const COLS: {
  key: SortKey;
  label: string;
  fmt: (v: number) => string;
  asc: boolean;
}[] = [
  { key: "rank", label: "#", fmt: (v) => String(v), asc: true },
  { key: "wpm", label: "Max WPM", fmt: (v) => fixed(v, 1), asc: false },
  { key: "sfb", label: "SFB", fmt: (v) => pct(v, 2), asc: true },
  { key: "roll_total", label: "Rolls", fmt: (v) => pct(v), asc: false },
  { key: "alternation", label: "Alt", fmt: (v) => pct(v), asc: false },
  { key: "pinky_load", label: "Pinky", fmt: (v) => pct(v), asc: true },
  { key: "home_row", label: "Home", fmt: (v) => pct(v), asc: false },
  { key: "travel_mm_per_char", label: "Travel", fmt: (v) => fixed(v, 2), asc: true },
];

interface Props {
  index: IndexData;
  onPick: (name: string) => void;
  selected: string;
}

export default function Leaderboard({ index, onPick, selected }: Props) {
  const [sort, setSort] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let r = index.layouts.slice();
    if (type !== "all") r = r.filter((x) => x.type === type);
    if (q.trim()) r = r.filter((x) => x.name.includes(q.trim().toLowerCase()));
    r.sort((a, b) => (asc ? a[sort] - b[sort] : b[sort] - a[sort]));
    return r;
  }, [index, sort, asc, type, q]);

  const types = useMemo(
    () => ["all", ...Array.from(new Set(index.layouts.map((l) => l.type)))],
    [index],
  );

  const setSortKey = (k: SortKey, defaultAsc: boolean) => {
    if (k === sort) setAsc(!asc);
    else {
      setSort(k);
      setAsc(defaultAsc);
    }
  };

  const maxWpm = useMemo(
    () => Math.max(...index.layouts.map((l) => l.wpm)),
    [index],
  );
  const minWpm = useMemo(
    () => Math.min(...index.layouts.map((l) => l.wpm)),
    [index],
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-8"
            placeholder="Search layouts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All geometries" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs uppercase tracking-wide text-muted-foreground">
          {rows.length} layouts
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Layout
              </th>
              {COLS.map((c) => {
                const active = sort === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => setSortKey(c.key, c.asc)}
                    className={cn(
                      "cursor-pointer select-none px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {active &&
                        (asc ? (
                          <ChevronUp className="size-3" />
                        ) : (
                          <ChevronDown className="size-3" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.name === selected;
              const t = (r.wpm - minWpm) / (maxWpm - minWpm || 1);
              return (
                <tr
                  key={r.name}
                  onClick={() => onPick(r.name)}
                  className={cn(
                    "cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/60",
                    active && "bg-secondary",
                  )}
                >
                  <td className="px-3 py-2 text-left">
                    <span className="mr-2 font-medium">{r.name}</span>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        background: `${typeColor(r.type)}22`,
                        color: typeColor(r.type),
                      }}
                    >
                      {r.type_label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className="h-1 rounded-full bg-primary/70"
                        style={{ width: `${8 + t * 46}px` }}
                      />
                      <span className="w-12 text-right tabular-nums">
                        {fixed(r.wpm, 1)}
                      </span>
                    </div>
                  </td>
                  {COLS.slice(2).map((c) => (
                    <td
                      key={c.key}
                      className="px-3 py-2 text-right tabular-nums text-muted-foreground"
                    >
                      {c.fmt(r[c.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
