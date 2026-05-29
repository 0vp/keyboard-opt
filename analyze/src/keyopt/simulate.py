"""Discrete-event biomechanical typing simulator.

Ten fingers are independent actuators that move in parallel; the two hands work
simultaneously. Each finger tracks where it last pressed and when it became
free. To press key i with finger f:

    travel_i = a + b * log2(D / W + 1)            # Fitts's law (1954)
    arrival_i = last_use_time[f] + lift + travel_i
    press_i   = max(arrival_i, press_{i-1} + C_min)

Because a finger keeps its position while *other* fingers press, idle fingers
have already "arrived" -> consecutive different-finger keys are limited only by
the central cadence C_min (this is rollover / hand alternation). Same-finger
bigrams reuse a finger that must physically travel after the previous press, so
they pay the full Fitts cost -> they are the dominant slowdown, matching
empirical inter-key-interval data (Dhakal et al. 2018; Feit et al. 2016).

Parameter ratios are literature-grounded; a single global time scale is fit in
calibrate.py so QWERTY lands at a realistic elite perfect-form ceiling.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .geometry import KEY_UNIT_MM, KeyPos
from .layout import Layout

# Home-row resting column for each finger (row 1 = home row).
HOME_COLUMN = {0: 1, 1: 2, 2: 3, 3: 4, 6: 7, 7: 8, 8: 9, 9: 10}


@dataclass
class SimParams:
    W: float = 17.0        # effective target width (mm), keycap landing zone
    a: float = 0.0         # Fitts intercept (ms); ~0 for pre-planned expert motion
    b: float = 90.0        # Fitts slope (ms/bit); finger IP ~ 11 bits/s
    lift: float = 25.0     # finger release/repositioning latency (ms)
    c_min: float = 70.0    # min central inter-press interval (ms)
    scale: float = 1.0     # global calibration multiplier


def _home_positions(layout: Layout) -> dict[int, tuple[float, float]]:
    """Resting (x_mm, y_mm) for each finger; thumbs rest on their thumb key."""
    by_index = {p.index: p for p in layout.positions}
    home: dict[int, tuple[float, float]] = {}
    for finger, col in HOME_COLUMN.items():
        p = by_index[12 + col]  # row 1
        home[finger] = (p.x * KEY_UNIT_MM, p.y * KEY_UNIT_MM)
    # thumbs rest at their thumb-row keys (left=38? use first thumb of each hand)
    home[4] = (layout.positions[37].x * KEY_UNIT_MM, layout.positions[37].y * KEY_UNIT_MM)
    home[5] = (layout.positions[39].x * KEY_UNIT_MM, layout.positions[39].y * KEY_UNIT_MM)
    return home


def simulate(layout: Layout, stream: str, params: SimParams) -> dict:
    pos = layout.positions

    # Precompute char -> (finger, target_x_mm, target_y_mm) once.
    char_map: dict[str, tuple[int, float, float]] = {}
    for ch, idx in layout.char_to_index.items():
        k: KeyPos = pos[idx]
        char_map[ch] = (k.finger, k.x * KEY_UNIT_MM, k.y * KEY_UNIT_MM)

    home = _home_positions(layout)
    finger_pos = dict(home)                 # current mm position per finger
    last_use = {f: 0.0 for f in range(10)}  # time of each finger's last press

    a, b, W, lift, c_min = params.a, params.b, params.W, params.lift, params.c_min

    press_prev = 0.0
    pressed = 0
    skipped = 0
    total_travel_mm = 0.0
    sfb_extra_ms = 0.0                       # time cost attributable to SFBs
    prev_finger = -1
    iki_sum = 0.0
    started = False

    for ch in stream:
        entry = char_map.get(ch)
        if entry is None:
            skipped += 1
            continue
        f, tx, ty = entry
        fx, fy = finger_pos[f]
        dist = math.hypot(tx - fx, ty - fy)
        travel = a + b * math.log2(dist / W + 1.0)

        if not started:
            press = travel
            started = True
        else:
            arrival = last_use[f] + lift + travel
            press = max(arrival, press_prev + c_min)
            iki = press - press_prev
            iki_sum += iki
            if f == prev_finger and dist > 1e-6:
                sfb_extra_ms += max(0.0, iki - c_min)

        last_use[f] = press
        finger_pos[f] = (tx, ty)
        total_travel_mm += dist
        press_prev = press
        prev_finger = f
        pressed += 1

    total_ms = press_prev * params.scale
    minutes = total_ms / 60000.0 if total_ms > 0 else 1e-9
    words = pressed / 5.0
    wpm = words / minutes
    mean_iki = (iki_sum / max(1, pressed - 1)) * params.scale

    return {
        "wpm": wpm,
        "mean_iki_ms": mean_iki,
        "total_ms": total_ms,
        "chars": pressed,
        "skipped": skipped,
        "travel_mm_per_char": total_travel_mm / max(1, pressed),
        "sfb_time_share": (sfb_extra_ms / press_prev) if press_prev else 0.0,
    }
