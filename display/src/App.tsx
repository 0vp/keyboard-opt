import { useEffect, useMemo, useState } from "react";
import { Keyboard, Activity, BookOpen, GitCompareArrows, Trophy } from "lucide-react";
import { loadIndex, loadLayout, loadMeta, loadMetrics } from "./lib/data";
import type {
  IndexData,
  LayoutDetail,
  MetaData,
  MetricDef,
} from "./lib/types";
import { typeColor } from "./lib/format";
import Keyboard3D, { type ColorMode } from "./components/Keyboard3D";
import StatPanel from "./components/StatPanel";
import ComparePanel from "./components/ComparePanel";
import Leaderboard from "./components/Leaderboard";
import LayoutList from "./components/LayoutList";
import Glossary from "./components/Glossary";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

type View = "explore" | "compare" | "browse";

function useLayoutDetail(name: string | null): LayoutDetail | null {
  const [detail, setDetail] = useState<LayoutDetail | null>(null);
  useEffect(() => {
    if (!name) {
      setDetail(null);
      return;
    }
    let active = true;
    loadLayout(name).then((d) => active && setDetail(d));
    return () => {
      active = false;
    };
  }, [name]);
  return detail;
}

export default function App() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);

  const [view, setView] = useState<View>("explore");
  const [corpus, setCorpus] = useState("english_10k");
  const [mode, setMode] = useState<ColorMode>("finger");
  const [glossary, setGlossary] = useState<{ open: boolean; focus: string | null }>(
    { open: false, focus: null },
  );

  const [selA, setSelA] = useState("graphite");
  const [selB, setSelB] = useState("qwerty");

  useEffect(() => {
    loadIndex().then((i) => {
      setIndex(i);
      setCorpus(i.default_corpus);
    });
    loadMetrics().then(setMetrics);
    loadMeta().then(setMeta);
  }, []);

  const detailA = useLayoutDetail(selA);
  const detailB = useLayoutDetail(selB);
  const baseline = useLayoutDetail("qwerty");

  const statsA = detailA?.corpora[corpus];
  const statsB = detailB?.corpora[corpus];
  const baseStats = baseline?.corpora[corpus];

  const highlightDiff = useMemo(() => {
    if (view !== "compare" || !detailA || !detailB) return undefined;
    const bPos = new Map(detailB.keys.map((k) => [k.char, `${k.row},${k.col}`]));
    const moved = new Set<string>();
    for (const k of detailA.keys) {
      if (bPos.get(k.char) !== `${k.row},${k.col}`) moved.add(k.char);
    }
    return moved;
  }, [view, detailA, detailB]);

  const openGlossary = (id: string) => setGlossary({ open: true, focus: id });

  if (!index || !meta || metrics.length === 0) {
    return (
      <div className="grid h-screen place-items-center bg-background bg-grid">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="size-4 animate-pulse text-primary" />
          <span className="text-sm uppercase tracking-[0.3em]">
            Calibrating instrument…
          </span>
        </div>
      </div>
    );
  }

  const corpusLabel = (c: string) =>
    c.replace("english_", "Top ").replace("k", "K");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ---------------- top instrument bar ---------------- */}
      <header className="relative z-20 flex items-center gap-6 border-b border-border bg-card/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
            <Keyboard className="size-5" />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-base tracking-tight">
              KEYBOARD LAYOUT LAB
            </h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              the theoretical human speed limit
            </p>
          </div>
        </div>

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as View)}
          className="ml-2"
        >
          <TabsList>
            <TabsTrigger value="explore">
              <Activity className="size-3.5" /> Explore
            </TabsTrigger>
            <TabsTrigger value="compare">
              <GitCompareArrows className="size-3.5" /> Compare
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Trophy className="size-3.5" /> Browse
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto flex items-center gap-2.5">
          <Select value={corpus} onValueChange={setCorpus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {index.corpora.map((c) => (
                <SelectItem key={c} value={c}>
                  {corpusLabel(c)} words
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {view !== "browse" && (
            <div className="flex rounded-md border border-border bg-card/60 p-1">
              {(["finger", "heat"] as ColorMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={
                    "rounded-sm px-3 py-1 text-xs uppercase tracking-wider transition-colors " +
                    (mode === m
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {m === "finger" ? "Fingers" : "Heatmap"}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setGlossary({ open: true, focus: null })}
          >
            <BookOpen className="size-3.5" /> Glossary
          </Button>
        </div>
      </header>

      {/* ---------------- main stage ---------------- */}
      {view === "explore" && (
        <main className="grid min-h-0 flex-1 grid-cols-[280px_1fr_360px] gap-4 p-4">
          <aside className="min-h-0">
            <LayoutList index={index} selected={selA} onSelect={setSelA} />
          </aside>

          <section className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card bg-dots">
            {detailA && (
              <>
                <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: typeColor(detailA.type) }}
                  />
                  <h2 className="font-display text-xl tracking-tight">
                    {detailA.name}
                  </h2>
                  <Badge variant="outline">{detailA.type_label}</Badge>
                  <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    rank #{
                      index.layouts.find((l) => l.name === detailA.name)?.rank
                    }
                  </span>
                </div>
                <Keyboard3D layout={detailA} mode={mode} />
              </>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto pr-1">
            {statsA && (
              <StatPanel
                stats={statsA}
                metrics={metrics}
                baseline={selA !== "qwerty" ? baseStats : undefined}
                onExplain={openGlossary}
              />
            )}
          </aside>
        </main>
      )}

      {view === "compare" && (
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <LayoutList
              index={index}
              selected={selA}
              onSelect={setSelA}
              accent="a"
              title="Layout A"
              compact
            />
            <LayoutList
              index={index}
              selected={selB}
              onSelect={setSelB}
              accent="b"
              title="Layout B"
              compact
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {detailA && (
              <div className="relative flex h-[340px] overflow-hidden rounded-lg border border-border bg-card bg-dots">
                <div className="absolute left-3 top-3 z-10 rounded-md bg-background/70 px-2.5 py-1 font-display text-sm text-signal">
                  {detailA.name}
                </div>
                <Keyboard3D
                  layout={detailA}
                  mode={mode}
                  highlightChars={highlightDiff}
                />
              </div>
            )}
            {detailB && (
              <div className="relative flex h-[340px] overflow-hidden rounded-lg border border-border bg-card bg-dots">
                <div className="absolute left-3 top-3 z-10 rounded-md bg-background/70 px-2.5 py-1 font-display text-sm text-signal-b">
                  {detailB.name}
                </div>
                <Keyboard3D
                  layout={detailB}
                  mode={mode}
                  highlightChars={highlightDiff}
                />
              </div>
            )}
          </div>
          {detailA && detailB && statsA && statsB && (
            <ComparePanel
              a={detailA}
              b={detailB}
              statsA={statsA}
              statsB={statsB}
              metrics={metrics}
              onExplain={openGlossary}
            />
          )}
          <p className="text-center text-xs text-muted-foreground">
            <span className="text-primary">Glowing keys</span> moved between the
            two layouts.
          </p>
        </main>
      )}

      {view === "browse" && (
        <main className="min-h-0 flex-1 p-4">
          <Leaderboard
            index={index}
            selected={selA}
            onPick={(n) => {
              setSelA(n);
              setView("explore");
            }}
          />
        </main>
      )}

      {/* ---------------- footer readout ---------------- */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/40 px-5 py-2.5 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wide">
          Simulated · {meta.n_words_sampled.toLocaleString()}-word{" "}
          {corpusLabel(corpus)} corpus · QWERTY ={" "}
          <span className="text-primary">
            {meta.calibration.qwerty_target_wpm} WPM
          </span>
        </span>
        <span className="uppercase tracking-wide">
          keycraft layouts · monkeytype corpus · Fitts's law + discrete-event sim
        </span>
      </footer>

      <Glossary
        open={glossary.open}
        metrics={metrics}
        focusId={glossary.focus}
        onClose={() => setGlossary({ open: false, focus: null })}
      />
    </div>
  );
}
