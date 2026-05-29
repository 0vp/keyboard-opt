"""Turn monkeytype word lists into a Zipf-weighted typing corpus.

The monkeytype lists are ordered by frequency but carry no counts, so we apply
a Zipf weight (weight ~ 1/rank^s) over each word's rank. From that weighting we
generate a deterministic continuous character stream (words joined by spaces),
and from the stream we count uni/bi/tri-grams. Stream and n-gram tables come
from the same source so simulated timings and reported metrics stay consistent.
"""

from __future__ import annotations

import random
from collections import Counter
from dataclasses import dataclass

ZIPF_S = 1.0


@dataclass
class Corpus:
    name: str
    stream: str                       # continuous lowercase text incl. spaces
    unigrams: Counter                 # char -> weight (count in stream)
    bigrams: Counter                  # (c1, c2) -> count
    trigrams: Counter                 # (c1, c2, c3) -> count
    total_chars: int

    def bigram_freq(self) -> dict[tuple[str, str], float]:
        total = sum(self.bigrams.values()) or 1
        return {k: v / total for k, v in self.bigrams.items()}

    def trigram_freq(self) -> dict[tuple[str, str, str], float]:
        total = sum(self.trigrams.values()) or 1
        return {k: v / total for k, v in self.trigrams.items()}


def build_corpus(name: str, words: list[str], *, n_words: int = 40000, seed: int = 1234) -> Corpus:
    clean = [w.lower() for w in words if w and w.isalpha()]
    if not clean:
        raise ValueError(f"{name}: no usable words")

    weights = [1.0 / ((rank + 1) ** ZIPF_S) for rank in range(len(clean))]
    rng = random.Random(seed)
    sampled = rng.choices(clean, weights=weights, k=n_words)
    stream = " ".join(sampled)

    unigrams = Counter(stream)
    bigrams = Counter(zip(stream, stream[1:]))
    trigrams = Counter(zip(stream, stream[1:], stream[2:]))

    return Corpus(
        name=name,
        stream=stream,
        unigrams=unigrams,
        bigrams=bigrams,
        trigrams=trigrams,
        total_chars=len(stream),
    )
