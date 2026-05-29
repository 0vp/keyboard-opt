# Analyze — methodology & references

This document records the data sources, the biomechanical model, and the
research the parameters are grounded in.

## Data sources

- **Keyboard layouts** — `rbscholtus/keycraft`, `data/layouts/*.klf`
  (https://github.com/rbscholtus/keycraft). 150 layouts spanning two physical
  geometries that this project treats distinctly:
  - **row-stagger** (`rowstag`/`anglemod`): traditional staircase keyboard;
    rows are offset horizontally `[0, 0.25, 0.75, 0]` key units.
  - **column-stagger** (`colstag`): ergonomic split board; columns are offset
    vertically `[0.35,0.35,0.1,0,0.1,0.2,0.2,0.1,0,0.1,0.35,0.35]` to match
    finger lengths. (`ortho` = no offset.)
  The geometry, finger map and per-type Euclidean distance are ported from
  keycraft `internal/keycraft/{keys.go,layout.go}`.
- **Ranking metrics** — keycraft's published table
  (https://rbscholtus.github.io/keycraft/), scraped for cross-reference.
- **Typing corpus** — monkeytype `english_1k`, `english_5k`, `english_10k`
  word lists. Lists are frequency-ordered; we apply a **Zipf weight**
  (w ~ 1/rank, Zipf's law) and sample a continuous character stream from them.

## Physical / anthropometric basis

- Key pitch = **19.05 mm** (standard keycap spacing).
- Effective Fitts target width `W ≈ 17 mm` ~ a keycap landing zone.
- Average adult hand (hand length ~189 mm, middle finger ~86 mm) underpins the
  assumption that all 30 alpha keys are reachable without wrist relocation, so
  inter-key cost is finger travel rather than gross arm movement.

## Simulation model

A discrete-event simulator types the whole corpus with **perfect form**. Ten
fingers are independent actuators and the two hands operate in parallel. For
keystroke *i* with finger *f* at key position *P*:

```
travel_i  = a + b · log2(D / W + 1)          # Fitts's law over distance D
arrival_i = last_use_time[f] + lift + travel_i
press_i   = max(arrival_i, press_{i-1} + C_min)
```

Idle fingers keep their position, so they have "already arrived" by the time
they are next needed — consecutive **different-finger** keys are limited only by
the central cadence `C_min`. This reproduces **rollover and hand alternation**
as speed sources, and makes **same-finger bigrams** (a finger that must travel
after just pressing) the dominant slowdown, matching empirical inter-key
interval data.

Parameter values (ratios fixed from literature; one global time scale is fit so
QWERTY reaches a realistic elite sustained ceiling of **150 WPM**):

| Param | Value | Basis |
|-------|-------|-------|
| Fitts `b` | 90 ms/bit | finger pointing index of performance ≈ 11 bits/s |
| Fitts `a` | 0 ms | pre-planned expert motion, negligible intercept |
| `lift` | 25 ms | finger release/repositioning latency |
| `C_min` | 70 ms | max sustained central stroke cadence (~14 keys/s ceiling) |
| `W` | 17 mm | keycap landing zone |

## References

1. Fitts, P. M. (1954). *The information capacity of the human motor system in
   controlling the amplitude of movement.* J. Exp. Psychol., 47(6).
2. Card, S., Moran, T., Newell, A. (1980). *The keystroke-level model for user
   performance time with interactive systems.* CACM, 23(7). (KLM expert/best
   typist keystroke times.)
3. Feit, A. M., Weir, D., Oulasvirta, A. (2016). *How We Type: Movement
   Strategies and Performance in Everyday Typing.* CHI 2016. (Finger usage,
   rollover, same-hand vs alternation timing.)
4. Dhakal, V., Feit, A. M., Kristensson, P. O., Oulasvirta, A. (2018).
   *Observations on Typing from 136 Million Keystrokes.* CHI 2018. (Inter-key
   interval distributions by bigram class; rollover in fast typists.)
5. MacKenzie, I. S. (1992). *Fitts' law as a research and design tool in
   human-computer interaction.* HCI, 7(1). (Fitts coefficients for HCI.)
6. Zipf, G. K. (1949). *Human Behavior and the Principle of Least Effort.*
   (Word-frequency weighting of the corpus.)

## Caveats

- The "theoretical max speed" is a *ceiling with flawless technique*, not an
  everyday speed. Differences between good layouts are small at the ceiling
  because non-same-finger motion is cadence-limited; the larger practical gains
  show up in effort metrics (finger travel, pinky load) and comfort metrics.
- Spaces are included in the **simulation** (you really do press space), so a
  layout that puts space on a finger instead of a thumb pays a real cost. The
  community-style **analytic metrics** (SFB%, rolls, …) exclude spaces to stay
  comparable with keycraft and other analyzers.
