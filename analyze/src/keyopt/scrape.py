"""Fetch raw inputs: keycraft layouts + ranking, and monkeytype word lists.

Everything is cached under analyze/data/cache so the pipeline can be re-run
offline. Network access happens only when a cached file is missing.
"""

from __future__ import annotations

import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path

import requests

CACHE = Path(__file__).resolve().parents[2] / "data" / "cache"
LAYOUT_DIR = CACHE / "layouts"
MONKEYTYPE_DIR = CACHE / "monkeytype"
RANKING_HTML = CACHE / "ranking.html"

GH_API_LAYOUTS = "https://api.github.com/repos/rbscholtus/keycraft/contents/data/layouts"
GH_RAW = "https://raw.githubusercontent.com/rbscholtus/keycraft/main/data/layouts/{name}"
KEYCRAFT_INDEX = "https://rbscholtus.github.io/keycraft/index.html"

MONKEYTYPE = {
    "english_1k": "https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english_1k.json",
    "english_5k": "https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english_5k.json",
    "english_10k": "https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english_10k.json",
}

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "keyopt-analyze/0.1 (research)"})


def _get(url: str, *, is_json: bool = False):
    for attempt in range(4):
        try:
            resp = _SESSION.get(url, timeout=30)
            resp.raise_for_status()
            return resp.json() if is_json else resp.text
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(1.5 * (attempt + 1))


def fetch_layouts() -> dict[str, str]:
    """Download every .klf layout (cached). Returns {name: klf_text}."""
    LAYOUT_DIR.mkdir(parents=True, exist_ok=True)
    listing = _get(GH_API_LAYOUTS, is_json=True)
    names = sorted(item["name"] for item in listing if item["name"].endswith(".klf"))

    out: dict[str, str] = {}
    for name in names:
        path = LAYOUT_DIR / name
        if not path.exists():
            path.write_text(_get(GH_RAW.format(name=name)), encoding="utf-8")
        out[name[:-4]] = path.read_text(encoding="utf-8")
    return out


def fetch_monkeytype() -> dict[str, list[str]]:
    """Download the english_1k/5k/10k word lists (cached)."""
    MONKEYTYPE_DIR.mkdir(parents=True, exist_ok=True)
    out: dict[str, list[str]] = {}
    for key, url in MONKEYTYPE.items():
        path = MONKEYTYPE_DIR / f"{key}.json"
        if not path.exists():
            path.write_text(_get(url), encoding="utf-8")
        out[key] = json.loads(path.read_text(encoding="utf-8"))["words"]
    return out


class _RankingParser(HTMLParser):
    """Parse the first <table> on the keycraft ranking page into row lists."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self.links: list[list[str]] = []
        self._in_table = False
        self._done_first = False
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self._row_links: list[str] | None = None
        self._href: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "table" and not self._done_first:
            self._in_table = True
        if not self._in_table:
            return
        if tag == "tr":
            self._row, self._row_links = [], []
        elif tag in ("td", "th"):
            self._cell, self._href = [], None
        elif tag == "a":
            for k, v in attrs:
                if k == "href":
                    self._href = v

    def handle_data(self, data):
        if self._in_table and self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag):
        if not self._in_table:
            return
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append("".join(self._cell).strip())
            self._row_links.append(self._href or "")
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
                self.links.append(self._row_links or [])
            self._row, self._row_links = None, None
        elif tag == "table":
            self._in_table = False
            self._done_first = True


def fetch_ranking() -> dict[str, dict]:
    """Scrape keycraft's ranking table -> {layout_name: {metric: value}}.

    Best-effort: returns {} if the page structure changes. Values are floats
    with percent signs stripped; the Name column links to layouts/<name>.html.
    """
    if not RANKING_HTML.exists():
        RANKING_HTML.parent.mkdir(parents=True, exist_ok=True)
        RANKING_HTML.write_text(_get(KEYCRAFT_INDEX), encoding="utf-8")

    parser = _RankingParser()
    parser.feed(RANKING_HTML.read_text(encoding="utf-8"))
    if len(parser.rows) < 3:
        return {}

    header = parser.rows[0]

    def slug(href: str) -> str | None:
        m = re.search(r"layouts/([^./]+)\.html", href)
        return m.group(1) if m else None

    def num(text: str):
        t = text.replace("%", "").replace("+", "").strip()
        try:
            return float(t)
        except ValueError:
            return None

    result: dict[str, dict] = {}
    for cells, links in zip(parser.rows[1:], parser.links[1:]):
        name = next((slug(h) for h in links if slug(h)), None)
        if not name:
            continue
        metrics: dict[str, float] = {}
        for col_name, cell in zip(header, cells):
            value = num(cell)
            if value is not None and col_name:
                metrics[col_name] = value
        result[name] = metrics
    return result


def fetch_all() -> dict:
    return {
        "layouts": fetch_layouts(),
        "monkeytype": fetch_monkeytype(),
        "ranking": fetch_ranking(),
    }
