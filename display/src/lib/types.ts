export interface KeyData {
  char: string;
  freq: number;
  index: number;
  row: number;
  col: number;
  finger: number;
  finger_name: string;
  finger_long: string;
  hand: "L" | "R";
  x: number;
  y: number;
}

export interface LayoutStats {
  wpm: number;
  mean_iki_ms: number;
  total_ms: number;
  chars: number;
  skipped: number;
  travel_mm_per_char: number;
  sfb_time_share: number;
  sfb: number;
  sfs: number;
  alternation: number;
  same_hand: number;
  roll_in: number;
  roll_out: number;
  roll_total: number;
  lateral_stretch: number;
  redirect: number;
  tri_roll: number;
  tri_alternation: number;
  in_out_ratio: number;
  finger_load: number[];
  row_load: number[];
  hand_load: number[];
  pinky_load: number;
  home_row: number;
}

export interface LayoutDetail {
  name: string;
  type: string;
  type_label: string;
  keys: KeyData[];
  key_unit_mm: number;
  corpora: Record<string, LayoutStats>;
  keycraft: Record<string, number>;
}

export interface SummaryRow {
  name: string;
  type: string;
  type_label: string;
  wpm: number;
  sfb: number;
  roll_total: number;
  alternation: number;
  pinky_load: number;
  home_row: number;
  travel_mm_per_char: number;
  rank: number;
}

export interface IndexData {
  default_corpus: string;
  corpora: string[];
  count: number;
  layouts: SummaryRow[];
}

export interface MetricDef {
  id: string;
  name: string;
  unit: string;
  better: "higher" | "lower";
  primary?: boolean;
  short: string;
  explain: string;
  quantify: string;
}

export interface MetaData {
  generated: string;
  corpora: string[];
  default_corpus: string;
  n_words_sampled: number;
  calibration: { qwerty_target_wpm: number; scale: Record<string, number> };
  sim_params: Record<string, number>;
  hand_model: Record<string, unknown>;
  sources: Record<string, string>;
}
