"""Analytic ergonomic metrics computed from the corpus + layout geometry.

These mirror the well-known community metrics (SFB, rolls, alternation,
redirects, lateral stretch, scissors, load balance) but are computed on the
monkeytype corpus so they line up with the simulation. The simulated WPM in
simulate.py is the headline; these explain *why* a layout is fast or slow.
"""

from __future__ import annotations

from .corpus import Corpus
from .geometry import LEFT, LT, RT, KEY_UNIT_MM
from .layout import Layout

# Lateral-stretch finger pairs -> minimum horizontal distance (key units).
LSB_PAIRS = {
    (2, 3): 2.0, (3, 2): 2.0,    # LM-LI
    (1, 3): 3.5, (3, 1): 3.5,    # LR-LI
    (0, 1): 2.0, (1, 0): 2.0,    # LP-LR
    (7, 6): 2.0, (6, 7): 2.0,    # RM-RI
    (8, 6): 3.5, (6, 8): 3.5,    # RR-RI
    (9, 8): 2.0, (8, 9): 2.0,    # RP-RR
}


def _inward_rank(finger: int) -> int:
    """Centre-ward rank: higher = closer to the index finger."""
    if finger <= 3:                # left hand pinky..index = 0..3
        return finger
    return 9 - finger              # right index..pinky -> 3..0


def _is_thumb(finger: int) -> bool:
    return finger in (LT, RT)


def compute_metrics(layout: Layout, corpus: Corpus) -> dict:
    pos = layout.positions
    ci = layout.char_to_index

    def kp(ch: str):
        idx = ci.get(ch)
        return pos[idx] if idx is not None else None

    uni = corpus.unigrams
    total_uni = sum(v for c, v in uni.items() if c != " " and kp(c)) or 1

    finger_load = [0.0] * 10
    row_load = [0.0] * 4
    hand_load = [0.0, 0.0]
    for ch, w in uni.items():
        if ch == " ":
            continue
        k = kp(ch)
        if not k:
            continue
        finger_load[k.finger] += w
        row_load[k.row] += w
        hand_load[k.hand] += w

    finger_load = [v / total_uni for v in finger_load]
    row_load = [v / total_uni for v in row_load]
    hand_load = [v / total_uni for v in hand_load]
    pinky_load = finger_load[0] + finger_load[9]

    # ---- bigram classes ----
    big = corpus.bigrams
    tot_big = 0.0
    sfb = same_hand = alt = roll_in = roll_out = 0.0
    lsb = 0.0
    for (a, b), w in big.items():
        if a == " " or b == " ":
            continue
        ka, kb = kp(a), kp(b)
        if not ka or not kb:
            continue
        tot_big += w
        if _is_thumb(ka.finger) or _is_thumb(kb.finger):
            if ka.hand != kb.hand:
                alt += w
            else:
                same_hand += w
            continue
        if ka.hand != kb.hand:
            alt += w
            continue
        same_hand += w
        if ka.finger == kb.finger:
            if ka.index != kb.index:
                sfb += w
            continue
        ra, rb = _inward_rank(ka.finger), _inward_rank(kb.finger)
        if rb > ra:
            roll_in += w
        else:
            roll_out += w
        col_dist = abs(ka.x - kb.x)
        if LSB_PAIRS.get((ka.finger, kb.finger), 1e9) <= col_dist:
            lsb += w
    tot_big = tot_big or 1

    # ---- skipgram (same finger skip) + trigram redirect/roll ----
    tri = corpus.trigrams
    tot_tri = 0.0
    sfs = redirect = tri_roll = tri_alt = 0.0
    for (a, b, c), w in tri.items():
        if a == " " or b == " " or c == " ":
            continue
        ka, kb, kc = kp(a), kp(b), kp(c)
        if not ka or not kb or not kc:
            continue
        tot_tri += w
        # same-finger skipgram: first & third, same finger, different key
        if (not _is_thumb(ka.finger) and ka.finger == kc.finger
                and ka.index != kc.index):
            sfs += w
        if ka.hand == kb.hand == kc.hand and not any(
            _is_thumb(k.finger) for k in (ka, kb, kc)
        ):
            r1 = _inward_rank(kb.finger) - _inward_rank(ka.finger)
            r2 = _inward_rank(kc.finger) - _inward_rank(kb.finger)
            if r1 != 0 and r2 != 0:
                if (r1 > 0) == (r2 > 0):
                    tri_roll += w
                else:
                    redirect += w
        elif ka.hand != kb.hand and kb.hand != kc.hand:
            tri_alt += w
    tot_tri = tot_tri or 1

    return {
        "sfb": sfb / tot_big,
        "sfs": sfs / tot_tri,
        "alternation": alt / tot_big,
        "same_hand": same_hand / tot_big,
        "roll_in": roll_in / tot_big,
        "roll_out": roll_out / tot_big,
        "roll_total": (roll_in + roll_out) / tot_big,
        "lateral_stretch": lsb / tot_big,
        "redirect": redirect / tot_tri,
        "tri_roll": tri_roll / tot_tri,
        "tri_alternation": tri_alt / tot_tri,
        "in_out_ratio": (roll_in / roll_out) if roll_out else 0.0,
        "finger_load": finger_load,
        "row_load": row_load,
        "hand_load": hand_load,
        "pinky_load": pinky_load,
        "home_row": row_load[1],
    }
