"""Parse .klf files into Layout objects (letters mapped to physical keys)."""

from __future__ import annotations

from dataclasses import dataclass

from .geometry import KeyPos, key_positions

# .klf tokens that are not literal single characters.
_TOKENS = {"~": None, "_": " ", "~~": "~", "__": "_", "##": "#"}


@dataclass
class Layout:
    name: str
    layout_type: str
    positions: list[KeyPos]            # 42 physical positions
    char_to_index: dict[str, int]      # character -> position index
    index_to_char: dict[int, str]      # position index -> character

    def pos_of(self, ch: str) -> KeyPos | None:
        idx = self.char_to_index.get(ch)
        return self.positions[idx] if idx is not None else None


def parse_klf(name: str, text: str) -> Layout:
    lines = [
        ln.strip()
        for ln in text.splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ]
    if not lines:
        raise ValueError(f"{name}: empty layout file")

    type_line = lines[0].lower()
    layout_type = next(
        (t for t in ("rowstag", "anglemod", "ortho", "colstag") if type_line.startswith(t)),
        None,
    )
    if layout_type is None:
        raise ValueError(f"{name}: unknown layout type '{type_line}'")

    expected = [12, 12, 12, 6]
    rows = lines[1:5]
    if len(rows) != 4:
        raise ValueError(f"{name}: expected 4 key rows, got {len(rows)}")

    runes: list[str | None] = []
    for r, (line, count) in enumerate(zip(rows, expected)):
        keys = line.split()
        if len(keys) != count:
            raise ValueError(f"{name}: row {r} has {len(keys)} keys, expected {count}")
        for key in keys:
            low = key.lower()
            if low in _TOKENS:
                runes.append(_TOKENS[low])
            elif len(key) == 1:
                runes.append(key)
            else:
                raise ValueError(f"{name}: bad key token '{key}'")

    positions = key_positions(layout_type)
    char_to_index: dict[str, int] = {}
    index_to_char: dict[int, str] = {}
    for idx, ch in enumerate(runes):
        if ch is not None:
            char_to_index[ch] = idx
            index_to_char[idx] = ch

    return Layout(
        name=name,
        layout_type=layout_type,
        positions=positions,
        char_to_index=char_to_index,
        index_to_char=index_to_char,
    )
