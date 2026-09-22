# Live corner prediction

Can in-play statistics predict how many corners a football match will finish
with, and at which minute is live data most informative?

Status: baseline established on 60,331 historical matches; live collection
starting from hand-logged in-play screenshots.

---

## The finding that shapes everything else

Corner totals are almost entirely luck.

For a Poisson mixture -- each match has a latent corner rate `lambda`, and the
count is `Poisson(lambda)` -- variance splits exactly:

```
Var(total) = E[lambda]      irreducible sampling noise
           + Var(lambda)    systematic, the only predictable part
```

Measured within division-season cells across 18 divisions and 10 seasons
(60,331 matches, so league regime and rule changes are not miscounted as
signal):

| quantity | value |
|---|---|
| mean total corners | 9.90 |
| sd of total corners | 3.42 |
| variance | 11.41 |
| Poisson (irreducible) share | **86.7%** |
| systematic (predictable) share | **13.3%** |
| spread of the latent rate | ±12% around the mean |

**13.3% is a hard ceiling on R² for predicting a match total.** Not a
limitation of our model -- a property of the game. The remaining 86.7% is the
coin-flip of which deflections happen to cross the byline.

Against that ceiling, out-of-sample (train 2015/16–2022/23, test 2023/24–2024/25,
team corner rates built from prior matches only so nothing leaks):

| model | R² | share of the 13.3% captured |
|---|---|---|
| league mean | 1.2% | 9% |
| + team rolling corner rates + market odds | 2.6% | 20% |
| + half-time scoreline | 3.1% | 23% |

So everything knowable at kickoff captures a fifth of the available signal, and
the half-time scoreline adds about half a percentage point.

## Why that makes live data interesting rather than pointless

At minute `t` the corners already taken are *known* -- zero variance. Only the
remainder is random, and its Poisson noise shrinks with the time left:

| minute | expected corners remaining | sd of final total | vs pre-match |
|---|---|---|---|
| 0 | 9.90 | 3.38 | 100% |
| 30 | 6.60 | 2.70 | 80% |
| 45 | 4.95 | 2.31 | 68% |
| 60 | 3.30 | 1.86 | 55% |
| 75 | 1.65 | 1.30 | 39% |
| 85 | 0.55 | 0.74 | 22% |

(Uniform-rate approximation. The real curve is second-half weighted; the live
snapshots will pin it down.)

This is the trap in the original question. "Which minute predicts best?" is
answered by *the last one* -- but almost all of that improvement is **free**.
Anyone can count the corners already taken. It is not skill and it carries no
edge, because the market counts them too.

## So the question has to be posed differently

Skill lives in exactly one place: estimating `lambda_remaining(t)`, the corner
rate over the minutes **still to be played**. That is the only quantity the
market must also estimate, and the only one where live statistics can beat it.

Hence:

- **Target** = corners from minute `t` to full time, not the match total.
- **Model** = a point process on the arrival rate, not a regression on the
  match total. Every minute of every match is exposure and each match carries
  ~10 events, so this extracts far more from a small hand-logged sample than a
  match-level regression could (see `analysis/power.py`).
- **Benchmark** = the live corner line, not the mean. Beating "9.9" is easy and
  worthless; beating the in-play price is the only result that means anything.
  This is why capturing odds alongside each snapshot is essential, not optional.

An honest expectation: with a 13.3% systematic ceiling and a market that
already prices the obvious, the likely answer is a thin-to-zero edge. That is
still a publishable result, and a negative one measured properly is worth more
than a positive one measured badly.

## What the capture design has to look like

Simulating the candidate designs before collecting anything turned up a trap.
A single mid-match snapshot per match -- the cheapest design, and the one that
breadth-beats-depth reasoning recommends -- recovers only **15% of a known
state effect**. The state is read at minute `t` but the predicted interval runs
to 90', and the match changes underneath it. That estimator would report that
live statistics barely matter, whatever the truth.

Three mid-match captures plus full time cuts the attenuation to 23% and is the
design of record. Details and the numbers in `collect/CAPTURE.md`.

## Hypotheses to test

1. The corner rate is **not uniform in time** -- it rises through the second
   half, peaking after ~75'. So the burn-off table above understates how much
   is still unresolved at minute 60.
2. The sweet spot for live value is **55–70'**: the tactical picture is legible
   and the scoreline is informative, while ~a third of corners are unkicked.
3. The strongest live features are the mechanical corner generators --
   **shots blocked**, **crosses**, **touches in the opposition box** -- ahead of
   possession or shot count.
4. **Corners so far is weaker than intuition suggests.** With a ±12% rate
   spread and 86.7% noise, a team on 6 corners at half-time regresses hard.
5. **Scoreline state matters more than the scoreline.** A one-goal margin late
   raises the rate; a three-goal margin kills it.

Hypothesis 4 is the one most likely to be wrong in an interesting way, and it is
the one that most live-betting intuition depends on.

## Layout

```
analysis/
  fetch_historical.sh    season CSVs from football-data.co.uk
  build_dataset.py       -> one tidy match table
  information_value.py   pre-match ceiling, half-time lift
  variance_budget.py     the Poisson/systematic split
  power.py               how many logged matches we need
data/
  raw/                   not committed (third-party, not ours to redistribute)
  derived/               committed aggregates
  snapshots/             hand-logged live matches
  SCHEMA.md              snapshot format + the panel-disagreement warning
collect/
  CAPTURE.md             what to screenshot, and when
```
