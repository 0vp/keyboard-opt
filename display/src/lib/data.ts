import type { IndexData, LayoutDetail, MetaData, MetricDef } from "./types";

const BASE = import.meta.env.BASE_URL;

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadIndex = () => getJSON<IndexData>("index.json");
export const loadMetrics = () => getJSON<MetricDef[]>("metrics.json");
export const loadMeta = () => getJSON<MetaData>("meta.json");

const layoutCache = new Map<string, Promise<LayoutDetail>>();
export function loadLayout(name: string): Promise<LayoutDetail> {
  let p = layoutCache.get(name);
  if (!p) {
    p = getJSON<LayoutDetail>(`layouts/${name}.json`);
    layoutCache.set(name, p);
  }
  return p;
}
