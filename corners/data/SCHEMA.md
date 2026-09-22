# Snapshot schema

One JSON file per match in `corners/data/snapshots/`, named
`YYYY-MM-DD-home-away.json`. Hand-transcribed from in-play screenshots.

## Why panels are stored separately

A bookmaker in-play page can show two stat panels that are fed by **different
providers with different event definitions**. They are not interchangeable.
Measured on the first match logged (Cuiaba v Nautico, 63:14, one minute apart):

| stat            | native panel | visual-stats panel | disagreement |
|-----------------|-------------:|-------------------:|-------------|
| Corners         |    6 / 3     |      5 / 3         | 1 corner    |
| Shots on target |    6 / 2     |      4 / 2         | definitional|
| Shots off target|   17 / 4     |     11 / 3         | definitional|
| Crosses         |   20 / 7     |     48 / 30        | **2.4x**    |
| Possession %    |   50 / 50    |     51 / 49        | rounding    |

A 2.4x gap in crosses cannot be feed lag -- the panels count different events
(almost certainly open-play crosses vs. all wide deliveries incl. set pieces).
Mixing them across matches would inject variance far larger than the corner
signal we are trying to measure. So: **never merge panels into one feature
column.** Pick one panel as canonical, keep the other as a parallel record.

Canonical = `visual_stats`. It is arithmetically self-consistent
(21 total shots = 4 on target + 11 off + 6 blocked = 14 inside box + 7 outside)
and it carries the features hypothesised to matter most for corners: shots
blocked, touches in the opposition box, throw-ins, crosses, big chances.

Known label bug in that panel: the row rendered `Assists` carries **passing
accuracy %** (80/80 matches the native panel's passing-accuracy row; 80 assists
is impossible). Transcribe by meaning, not by the printed label, and check row
labels against arithmetic.

## Fields

Arrays are always `[home, away]`.

- `minute_decimal` -- the clock as a number (63:14 -> 63.23). The precise clock
  matters: it is the independent variable of the whole study.
- `period` -- 1 or 2. Needed because 45:00+ stoppage and 90:00+ stoppage behave
  differently from regulation minutes.
- `corners` -- the running count. This is both a feature and, at full time, the
  label.
- `final` -- filled in after full time. A snapshot file with `final: null` is
  unusable for training; chasing these down later is the main data-loss risk.
- `odds` -- in-play corner market at the same timestamp, when captured. Without
  it we can measure accuracy but not edge.
