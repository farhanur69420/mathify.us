"""How many hand-logged matches do we need?

A match-level regression treats one match as one data point, so 30 matches is
30 rows and the study is hopeless. But corners are a point process: every
minute of every match is exposure, and each match carries ~10 events. Modelling
the ARRIVAL RATE instead of the match total extracts far more from the same
screenshots.

This simulates that design honestly -- generate corner arrivals from a known
rate model, fit a Poisson GLM on 5-minute bins, and ask how often we recover
the effect. That turns "how much data do you need" into a number instead of a
guess.
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import PoissonRegressor

RNG = np.random.default_rng(7)
BASE = 9.899 / 90.0     # corners per minute, from the 60k-match baseline
BIN = 5                 # minutes per snapshot interval
NBIN = 90 // BIN

def simulate(n_matches, beta, lam_sd=1.23 / 9.899):
    """Corner counts in 5-min bins. `beta` is the log-rate effect of a binary
    in-match state (e.g. 'one-goal game' vs not) that switches on at halftime
    in half the matches. lam_sd adds the real match-to-match rate spread."""
    rows = []
    for m in range(n_matches):
        scale = np.exp(RNG.normal(0, lam_sd))        # latent match rate
        on = RNG.random() < 0.5
        for b in range(NBIN):
            t_mid = b * BIN + BIN / 2
            state = 1.0 if (on and t_mid > 45) else 0.0
            rate = BASE * scale * np.exp(beta * state)
            rows.append((RNG.poisson(rate * BIN), state, t_mid, m))
    return pd.DataFrame(rows, columns=["k", "state", "t", "match"])

def fit_beta(df):
    X = np.column_stack([df.state.values, df.t.values / 90.0])
    m = PoissonRegressor(alpha=1e-6, max_iter=5000)
    m.fit(X, df.k.values)
    return m.coef_[0]

print("Recovering a known in-match rate effect from hand-logged matches.")
print("Effect sizes as rate multipliers; 200 replicates each.\n")
print(f"{'matches':>8}", end="")
for mult in (1.15, 1.25, 1.40):
    print(f"{'x'+str(mult):>18}", end="")
print()
print(f"{'':>8}" + f"{'sd(est)  power':>18}" * 3)

for n in (10, 20, 30, 50, 100, 200):
    print(f"{n:>8}", end="")
    for mult in (1.15, 1.25, 1.40):
        beta = np.log(mult)
        ests = np.array([fit_beta(simulate(n, beta)) for _ in range(200)])
        sd = ests.std()
        # two-sided detection at ~95%: |est| > 1.96 * sd
        power = float(np.mean(np.abs(ests) > 1.96 * sd))
        print(f"{sd:>10.3f}{power:>8.0%}", end="")
    print()

print("\nBias check (should sit near the true value):")
for n in (30, 100):
    for mult in (1.25,):
        ests = np.array([fit_beta(simulate(n, np.log(mult))) for _ in range(200)])
        print(f"  n={n:<4} true={np.log(mult):.3f}  "
              f"mean est={ests.mean():.3f}  sd={ests.std():.3f}")
