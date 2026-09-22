# What to capture, and when

Hand-logged from in-play screenshots. The design below is not a guess -- it is
the output of `../analysis/design_power.py`, which simulated corner arrivals
from a known rate model and then showed each candidate design only what it
would actually have seen.

## Three mid-match captures per match, plus full time

```
~35'      ~55'      ~72'      full time
```

Four moments. Roughly 10 images per match.

## Why not one snapshot per match (which is what I first recommended)

It seemed obvious that breadth beats depth: match-to-match rate variation is
the dominant noise, so more matches should win. It is wrong, and badly so.

At a fixed budget of 160 images, recovering a state effect whose true value is
a **x1.30** rate multiplier (log-effect 0.262):

| design | matches | sd(est) | mean estimate | attenuation |
|---|---|---|---|---|
| 1 mid-match capture + FT | 40 | 0.173 | **0.039** | **85% too small** |
| 3 mid-match captures + FT | 16 | 0.261 | 0.202 | 23% too small |
| 5 mid-match captures + FT | 10 | 0.355 | 0.207 | 21% too small |

The sparse design recovers a seventh of the true effect. The cause is exposure
misclassification: you read the state at minute `t`, but the interval you are
predicting runs all the way to minute 90, and the state changes during it. A
goal on 70' rewrites the game the snapshot claimed to describe. The longer the
interval, the more the covariate describes a match that no longer exists, and
the estimate collapses toward zero.

That failure mode is worse than low power. Low power means "we could not tell."
An 85% attenuated estimator confidently reports that **live state barely
matters** -- the exact false negative this project exists to avoid.

Three captures is the sweet spot: it cuts attenuation to 23% while keeping
enough matches to hold the variance down. Five captures buys no less bias and
costs precision.

## The header's by-half corner split is free data -- always capture it

The header line reading e.g. `5:1 | 1:2` is the corner count split by half. That
hands over an extra interval boundary at 45' at no cost, tightening the same
attenuation problem. Never skip the header screenshot: it carries the clock,
the teams, the competition, and this split.

## Which screenshots, per moment

1. **The header** -- clock, competition, team names, corner and goal glyphs,
   by-half split. Not optional; the clock is the study's independent variable.
2. **Stats panel, top half** -- down to about `Passes in final third`.
3. **Stats panel, bottom half** -- from there to `Goal kicks`.

At full time the header alone is enough if you are short of time, but the full
panel is worth having.

Use the **white "visual stats" panel** (the one with `Shots blocked`,
`Touches in opposition box`, `Throw-ins`, `Big Chances`), never the dark native
panel. The two are fed by different providers and disagree by 2.4x on crosses
(see `../data/SCHEMA.md`). Pick one and never switch.

**Full time is mandatory.** A mid-match snapshot with no final corner count has
features and no label, and is worth nothing. If you start a match, finish it.

## Odds

Capture the **in-play corners market** at each mid-match moment -- over/under
lines and prices. This is what turns "can we predict corners" into "can we beat
the price", which is the only version of the question with a meaningful answer.
Beating the mean of 9.9 is trivial and worth nothing.

If the corners market is suspended, note it; suspension patterns are themselves
informative.

## How much is enough

Two milestones, both real:

- **~30 matches** -- enough to measure the within-match corner rate curve
  (does the rate genuinely rise after 70'?) to about ±14% per time bin. Every
  match contributes to every bin, so this needs far less data than a state
  effect does. Publishable on its own, and it replaces the uniform-rate
  assumption in the burn-off table in `../README.md`.
- **~120 matches** -- 80% power to detect a x1.30 in-match state effect with
  the 3-capture design. This is what it costs to answer "which minute is most
  useful" properly. About 1,200 images; at four matches a day, roughly a month.

Anything below ~30 matches validates the pipeline and produces no trustworthy
estimate. That is worth saying plainly up front.

## Which leagues, if you have a choice

Prefer the 18 divisions with historical baselines (English tiers 1-4, the big-5
European leagues and their second tiers, Netherlands, Belgium, Portugal,
Turkey, Greece, Scotland). Those come with a 60,331-match prior, so your
snapshots go straight to estimating the in-play update rather than the league's
base rate.

Brazilian Serie B -- the first match logged -- has **no free historical corner
data**, so its base rate has to come from your snapshots alone (~15-20 matches
just to establish it). Fine if that is what is on at your hours; simply worth
less per screenshot than a European match.

## Sending them

Paste into chat. They get transcribed into
`../data/snapshots/<date>-<home>-<away>.json` against `../data/SCHEMA.md`, with
each panel kept separate and label bugs annotated rather than silently fixed.
