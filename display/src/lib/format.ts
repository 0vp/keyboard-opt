// Finger -> color (left warm, right cool; index brightest).
export const FINGER_COLORS: Record<number, string> = {
  0: "#7c3aed", // LP
  1: "#2563eb", // LR
  2: "#0891b2", // LM
  3: "#059669", // LI
  4: "#64748b", // LT
  5: "#64748b", // RT
  6: "#16a34a", // RI
  7: "#ca8a04", // RM
  8: "#ea580c", // RR
  9: "#dc2626", // RP
};

export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const fixed = (v: number, d = 1) => v.toFixed(d);

// Heatmap from low (cool) to high (hot) usage. t in [0,1].
export function heatColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const stops = [
    [30, 41, 59], // slate (cold)
    [37, 99, 235], // blue
    [16, 185, 129], // green
    [234, 179, 8], // yellow
    [220, 38, 38], // red (hot)
  ];
  const seg = c * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

export const KEY_LABEL: Record<string, string> = {
  space: "␣",
  "_": "_",
};

export function keyLabel(ch: string): string {
  return KEY_LABEL[ch] ?? ch;
}

// Geometry-type accent (used for badges / dots).
export const TYPE_COLORS: Record<string, string> = {
  rowstag: "#38bdf8",
  colstag: "#a78bfa",
  ortho: "#34d399",
  anglemod: "#fbbf24",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#94a3b8";
}

export const FINGER_SHORT = ["LP", "LR", "LM", "LI", "LT", "RT", "RI", "RM", "RR", "RP"];
