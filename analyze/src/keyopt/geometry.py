"""Physical keyboard geometry, ported faithfully from keycraft.

A layout has 42 positions: 3 rows of 12 keys (6 left, 6 right) plus a thumb
row of 6 (3 left, 3 right). The physical (x, y) of each key depends on the
keyboard's stagger type. Distances between keys are Euclidean in key units,
which we convert to millimetres for the biomechanical simulation.

Source: rbscholtus/keycraft internal/keycraft/{keys.go,layout.go}.
"""

from __future__ import annotations

from dataclasses import dataclass

# 1 key unit (key pitch) in millimetres. Standard MX/keycap spacing is 19.05mm.
KEY_UNIT_MM = 19.05

# Finger ids, matching keycraft.
LP, LR, LM, LI, LT, RT, RI, RM, RR, RP = range(10)

FINGER_NAMES = {
    LP: "LP", LR: "LR", LM: "LM", LI: "LI", LT: "LT",
    RT: "RT", RI: "RI", RM: "RM", RR: "RR", RP: "RP",
}

FINGER_LONG = {
    LP: "Left Pinky", LR: "Left Ring", LM: "Left Middle", LI: "Left Index",
    LT: "Left Thumb", RT: "Right Thumb", RI: "Right Index", RM: "Right Middle",
    RR: "Right Ring", RP: "Right Pinky",
}

LEFT, RIGHT = 0, 1

# Column -> finger for the three main rows (12 columns).
KEY_TO_FINGER = [
    LP, LP, LR, LM, LI, LI, RI, RI, RM, RR, RP, RP,  # row 0
    LP, LP, LR, LM, LI, LI, RI, RI, RM, RR, RP, RP,  # row 1
    LP, LP, LR, LM, LI, LI, RI, RI, RM, RR, RP, RP,  # row 2
    LT, LT, LT, RT, RT, RT,                          # row 3 (thumbs)
]

# Angle-mod differs only on the bottom row's left half.
ANGLEMOD_KEY_TO_FINGER = [
    LP, LP, LR, LM, LI, LI, RI, RI, RM, RR, RP, RP,
    LP, LP, LR, LM, LI, LI, RI, RI, RM, RR, RP, RP,
    LP, LR, LM, LI, LI, LI, RI, RI, RM, RR, RP, RP,
    LT, LT, LT, RT, RT, RT,
]

# Horizontal offset (key units) per row for row-staggered boards.
ROW_STAG_OFFSETS = [0.0, 0.25, 0.75, 0.0]

# Vertical offset (key units) per column for column-staggered boards.
COL_STAG_OFFSETS = [0.35, 0.35, 0.1, 0.0, 0.1, 0.2, 0.2, 0.1, 0.0, 0.1, 0.35, 0.35]

LAYOUT_TYPES = ("rowstag", "anglemod", "ortho", "colstag")


@dataclass(frozen=True)
class KeyPos:
    """A physical key position and its assigned finger/hand."""

    index: int        # 0..41
    row: int          # 0..3
    col: int          # 0..11 (0..5 for thumb row)
    finger: int       # 0..9
    hand: int         # LEFT or RIGHT
    x: float          # physical x in key units (column space)
    y: float          # physical y in key units (row space)

    @property
    def x_mm(self) -> float:
        return self.x * KEY_UNIT_MM

    @property
    def y_mm(self) -> float:
        return self.y * KEY_UNIT_MM


def _hand_of(row: int, col: int) -> int:
    if row < 3 and col < 6:
        return LEFT
    if row == 3 and col < 3:
        return LEFT
    return RIGHT


def physical_xy(row: int, col: int, layout_type: str) -> tuple[float, float]:
    """Physical (x, y) of a key in key units for the given stagger type.

    x grows to the right (columns); y grows downward (rows). Stagger shifts
    rows horizontally (row-stagger) or columns vertically (column-stagger),
    matching keycraft's distance functions.
    """
    x = float(col)
    y = float(row)
    if layout_type in ("rowstag", "anglemod"):
        x += ROW_STAG_OFFSETS[row]
    elif layout_type == "colstag":
        if row < 3:  # thumb row is not column-staggered
            y += COL_STAG_OFFSETS[col]
    return x, y


def key_positions(layout_type: str) -> list[KeyPos]:
    """All 42 key positions for a layout type (independent of letters)."""
    finger_map = ANGLEMOD_KEY_TO_FINGER if layout_type == "anglemod" else KEY_TO_FINGER
    positions: list[KeyPos] = []
    for index in range(42):
        if index < 36:
            row, col = index // 12, index % 12
        else:
            row, col = 3, index - 36
        x, y = physical_xy(row, col, layout_type)
        positions.append(
            KeyPos(
                index=index,
                row=row,
                col=col,
                finger=finger_map[index],
                hand=_hand_of(row, col),
                x=x,
                y=y,
            )
        )
    return positions


def euclidean_units(a: KeyPos, b: KeyPos) -> float:
    """Euclidean distance between two keys in key units."""
    return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5
