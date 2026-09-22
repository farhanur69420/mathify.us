# Simulation results

Recorded because both scripts take ~10 minutes and their numbers are cited in
`../README.md` and `../collect/CAPTURE.md`.

## `power.py` -- idealised design (a capture every 5 minutes)

Not a design we would ask anyone to execute -- 18 captures per match -- but it
sets the upper bound on what the point-process approach can extract, and it
confirms the estimator is unbiased when intervals are short.

Recovering a known in-match rate effect, 200 replicates, detection at |est| >
1.96 sd:

| matches | x1.15 sd / power | x1.25 sd / power | x1.40 sd / power |
|---|---|---|---|
| 10 | 0.284 / 7% | 0.275 / 14% | 0.292 / 14% |
| 20 | 0.189 / 14% | 0.186 / 21% | 0.191 / 44% |
| 30 | 0.156 / 12% | 0.148 / 34% | 0.145 / 64% |
| 50 | 0.128 / 24% | 0.108 / 51% | 0.120 / 84% |
| 100 | 0.085 / 34% | 0.079 / 80% | 0.072 / 99% |
| 200 | 0.066 / 52% | 0.053 / 99% | 0.054 / 100% |

Bias check -- true 0.223: mean estimate 0.225 at n=30, 0.222 at n=100. Clean.
Short intervals mean no attenuation, which is the whole point of the
comparison below.

## `design_power.py` -- realistic designs at a fixed image budget

160 images, true effect x1.30 (log-effect 0.262):

| design | matches | sd(est) | mean est | attenuation |
|---|---|---|---|---|
| 1 mid-match + FT | 40 | 0.173 | 0.039 | 85% |
| 3 mid-match + FT | 16 | 0.261 | 0.202 | 23% |
| 5 mid-match + FT | 10 | 0.355 | 0.207 | 21% |

## Why 3 captures is the operating point

Scaling `sd ~ 1/sqrt(n)` from the 3-capture row, 80% power on a x1.30 effect
needs `16 * (0.261 / (0.262/2.8))^2` = **~120 matches**.

The idealised 5-minute design would need roughly 75 matches for the same
effect -- but at 18 captures per match instead of 3. Per screenshot, the
3-capture design is about five times more efficient, and it sits near the bias
floor already: going to 5 captures buys no reduction in attenuation and costs
precision.

## The residual 23% attenuation is correctable

It is a property of the observation design, not of the data, so it can be
calibrated away: simulate the fitted model through the same 3-capture
observation process, measure how much the effect shrinks, and invert it. Worth
doing before publishing any effect size, and worth remembering when reading an
early estimate -- a raw 3-capture estimate understates the truth by roughly a
quarter.

This does not rescue the 1-capture design. Correcting an 85% attenuation means
multiplying by ~6.7, which multiplies the noise too.
