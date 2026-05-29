"""Orchestrate the pipeline and write static JSON for the display app.

Run:  python -m keyopt.build
Uses cached scrapes when present; otherwise fetches once. Writes to
display/public/data/.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

from . import scrape
from .calibrate import QWERTY_TARGET_WPM, calibrate
from .corpus import build_corpus
from .geometry import FINGER_LONG, FINGER_NAMES, KEY_UNIT_MM
from .glossary import METRICS
from .layout import Layout, parse_klf
from .metrics import compute_metrics
from .simulate import SimParams, simulate

OUT = Path(__file__).resolve().parents[3] / "display" / "public" / "data"
CORPORA = ["english_1k", "english_5k", "english_10k"]
DEFAULT_CORPUS = "english_10k"
N_WORDS = 24000

TYPE_LABELS = {
    "rowstag": "Row-stagger",
    "anglemod": "Angle-mod",
    "ortho": "Ortholinear",
    "colstag": "Column-stagger",
}


def _round(obj, nd=4):
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, list):
        return [_round(v, nd) for v in obj]
    if isinstance(obj, dict):
        return {k: _round(v, nd) for k, v in obj.items()}
    return obj


def _keys_payload(layout: Layout, freq: dict[str, float]) -> list[dict]:
    keys = []
    for idx, ch in layout.index_to_char.items():
        k = layout.positions[idx]
        keys.append({
            "char": ch if ch != " " else "space",
            "freq": round(freq.get(ch, 0.0), 5),
            "index": k.index,
            "row": k.row,
            "col": k.col,
            "finger": k.finger,
            "finger_name": FINGER_NAMES[k.finger],
            "finger_long": FINGER_LONG[k.finger],
            "hand": "L" if k.hand == 0 else "R",
            "x": round(k.x, 4),
            "y": round(k.y, 4),
        })
    return sorted(keys, key=lambda d: d["index"])


def main() -> None:
    t0 = time.time()
    print("Scraping inputs (cached when available)...")
    raw = scrape.fetch_all()
    klf = raw["layouts"]
    monkeytype = raw["monkeytype"]
    ranking = raw["ranking"]
    print(f"  {len(klf)} layouts, {len(ranking)} ranking rows scraped")

    layouts: dict[str, Layout] = {}
    for name, text in klf.items():
        try:
            layouts[name] = parse_klf(name, text)
        except ValueError as e:
            print(f"  skip {name}: {e}")
    print(f"  parsed {len(layouts)} layouts")

    print("Building corpora...")
    corpora = {c: build_corpus(c, monkeytype[c], n_words=N_WORDS) for c in CORPORA}

    # Per-character usage frequency (default corpus, alphabetic only) for heatmaps.
    uni = corpora[DEFAULT_CORPUS].unigrams
    tot = sum(v for ch, v in uni.items() if ch != " ") or 1
    char_freq = {ch: v / tot for ch, v in uni.items() if ch != " "}

    if "qwerty" not in layouts:
        raise SystemExit("qwerty layout missing; cannot calibrate")
    params: dict[str, SimParams] = {}
    for c in CORPORA:
        params[c] = calibrate(layouts["qwerty"], corpora[c].stream)
    print(f"  calibrated (QWERTY -> {QWERTY_TARGET_WPM} WPM); "
          f"scale[{DEFAULT_CORPUS}]={params[DEFAULT_CORPUS].scale:.3f}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "layouts").mkdir(exist_ok=True)

    summary = []
    names = sorted(layouts)
    for i, name in enumerate(names, 1):
        lay = layouts[name]
        per_corpus = {}
        for c in CORPORA:
            sim = simulate(lay, corpora[c].stream, params[c])
            met = compute_metrics(lay, corpora[c])
            merged = {**sim, **met}
            per_corpus[c] = _round(merged)

        payload = {
            "name": name,
            "type": lay.layout_type,
            "type_label": TYPE_LABELS.get(lay.layout_type, lay.layout_type),
            "keys": _keys_payload(lay, char_freq),
            "key_unit_mm": KEY_UNIT_MM,
            "corpora": per_corpus,
            "keycraft": _round(ranking.get(name, {})),
        }
        (OUT / "layouts" / f"{name}.json").write_text(
            json.dumps(payload), encoding="utf-8"
        )

        d = per_corpus[DEFAULT_CORPUS]
        summary.append({
            "name": name,
            "type": lay.layout_type,
            "type_label": payload["type_label"],
            "wpm": d["wpm"],
            "sfb": d["sfb"],
            "roll_total": d["roll_total"],
            "alternation": d["alternation"],
            "pinky_load": d["pinky_load"],
            "home_row": d["home_row"],
            "travel_mm_per_char": d["travel_mm_per_char"],
        })
        if i % 25 == 0 or i == len(names):
            print(f"  analyzed {i}/{len(names)}")

    summary.sort(key=lambda s: s["wpm"], reverse=True)
    for rank, s in enumerate(summary, 1):
        s["rank"] = rank

    (OUT / "index.json").write_text(json.dumps({
        "default_corpus": DEFAULT_CORPUS,
        "corpora": CORPORA,
        "count": len(summary),
        "layouts": summary,
    }), encoding="utf-8")

    (OUT / "metrics.json").write_text(json.dumps(METRICS), encoding="utf-8")

    (OUT / "meta.json").write_text(json.dumps({
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "corpora": CORPORA,
        "default_corpus": DEFAULT_CORPUS,
        "n_words_sampled": N_WORDS,
        "calibration": {
            "qwerty_target_wpm": QWERTY_TARGET_WPM,
            "scale": {c: round(params[c].scale, 4) for c in CORPORA},
        },
        "sim_params": {
            "fitts_W_mm": SimParams().W,
            "fitts_a_ms": SimParams().a,
            "fitts_b_ms_per_bit": SimParams().b,
            "finger_lift_ms": SimParams().lift,
            "central_min_iki_ms": SimParams().c_min,
            "key_unit_mm": KEY_UNIT_MM,
        },
        "hand_model": {
            "note": "Average adult hand; finger landing zone W approximates a keycap.",
            "hand_length_mm": 189,
            "middle_finger_length_mm": 86,
        },
        "sources": {
            "layouts": "rbscholtus/keycraft (data/layouts/*.klf)",
            "ranking": "https://rbscholtus.github.io/keycraft/",
            "corpus": "monkeytype english_1k/5k/10k word lists",
        },
    }), encoding="utf-8")

    print(f"Done in {time.time() - t0:.1f}s -> {OUT}")


if __name__ == "__main__":
    main()
