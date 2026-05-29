import { useEffect, useRef } from "react";
import type { MetricDef } from "../lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  open: boolean;
  metrics: MetricDef[];
  focusId: string | null;
  onClose: () => void;
}

export default function Glossary({ open, metrics, focusId, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && focusId) {
      const t = setTimeout(() => {
        ref.current
          ?.querySelector(`#metric-${focusId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [open, focusId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>What the numbers mean</DialogTitle>
          <DialogDescription>
            Every metric in plain English. The headline stat is the simulated{" "}
            <span className="text-primary">theoretical max speed</span>; the rest
            explain why a layout is fast or comfortable.
          </DialogDescription>
        </DialogHeader>
        <div ref={ref} className="-mr-2 max-h-[60vh] overflow-y-auto pr-2">
          {metrics.map((m) => (
            <div
              key={m.id}
              id={`metric-${m.id}`}
              className={cn(
                "border-t border-border py-4 transition-colors",
                focusId === m.id && "-mx-3 rounded-lg bg-secondary px-3",
              )}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-display text-base">{m.name}</h3>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {m.unit}
                </span>
                <span
                  className={cn(
                    "text-[11px] uppercase tracking-wide",
                    m.better === "higher" ? "text-good" : "text-signal-c",
                  )}
                >
                  {m.better === "higher" ? "higher is better" : "lower is better"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                {m.explain}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                <span className="text-foreground/70">How it's measured:</span>{" "}
                {m.quantify}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
