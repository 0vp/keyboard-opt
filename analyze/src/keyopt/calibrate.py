"""Calibrate the simulator's absolute time scale.

Parameter *ratios* (Fitts slope, lift, central cadence) are fixed from the
literature; only one global time scale is free. We choose it so QWERTY reaches
a realistic elite, perfect-form sustained ceiling. All other layouts are then
reported on the same scale, making cross-layout deltas meaningful.
"""

from __future__ import annotations

from .layout import Layout
from .simulate import SimParams, simulate

# Elite sustained perfect-form ceiling for QWERTY (WPM). Real-world elite
# typists sustain ~150-170 WPM; record bursts go higher. We anchor the
# theoretical ceiling at the conservative sustained end.
QWERTY_TARGET_WPM = 150.0


def calibrate(qwerty: Layout, stream: str) -> SimParams:
    base = SimParams(scale=1.0)
    raw = simulate(qwerty, stream, base)
    # wpm is inversely proportional to total time, hence to scale.
    scale = raw["wpm"] / QWERTY_TARGET_WPM
    return SimParams(
        W=base.W, a=base.a, b=base.b, lift=base.lift, c_min=base.c_min, scale=scale
    )
