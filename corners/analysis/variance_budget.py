"""Split corner variance into systematic (predictable) and Poisson (not).

For a Poisson mixture -- each match has its own latent rate lambda, and the
count is Poisson(lambda) -- the variance decomposes exactly:

    Var(total) = E[lambda]          <- sampling noise, irreducible
               + Var(lambda)        <- systematic, the only thing predictable

So the ceiling on R^2 for ANY model of total corners is Var(lambda)/Var(total).
No amount of live data or model sophistication beats it, because the rest is
the coin-flip of where the ball goes out of play.

Var(lambda) is computed within division-season cells so that league regime and
season-to-season rule changes do not get counted as predictable signal -- that
would flatter the ceiling.
"""
import json, os
import numpy as np
import pandas as pd

HERE = os.path.dirname(__file__)
d = pd.read_csv(os.path.join(HERE, "..", "data", "raw", "matches.csv"),
                low_memory=False)
d["season"] = d.season.astype(str).str.zfill(4)
y = d.corners_total

def budget(x):
    m, v = x.mean(), x.var(ddof=1)
    sysvar = max(v - m, 0.0)          # Var(lambda) = Var(total) - E[lambda]
    return pd.Series({"n": len(x), "mean": m, "var": v,
                      "poisson_var": m, "sys_var": sysvar,
                      "sys_share": sysvar / v})

print("=== pooled (includes league + season heterogeneity) ===")
print(budget(y).round(3).to_string())

cells = d.groupby(["division", "season"]).corners_total.apply(budget).unstack()
cells = cells[cells.n >= 150]
w = cells.n / cells.n.sum()
within = pd.Series({
    "cells": len(cells),
    "mean": (cells["mean"] * w).sum(),
    "var": (cells["var"] * w).sum(),
    "poisson_var": (cells.poisson_var * w).sum(),
    "sys_var": (cells.sys_var * w).sum(),
})
within["sys_share"] = within.sys_var / within["var"]
print("\n=== within division-season (the honest ceiling) ===")
print(within.round(3).to_string())

ceil_r2 = within.sys_share
print(f"\nCEILING on R^2 for predicting the match total: {ceil_r2:.1%}")
print(f"Our pre-match model reached 2.6%  ->  "
      f"{0.026/ceil_r2:.0%} of the available signal already captured.")
print(f"sd of the latent rate lambda across matches: "
      f"{np.sqrt(within.sys_var):.2f} corners "
      f"(+/-{np.sqrt(within.sys_var)/within['mean']:.0%} around the mean)")

# ---- why live data is different ----------------------------------------
# At minute t the corners already taken are KNOWN (zero variance). Only the
# remainder is random, and its Poisson noise shrinks with the time left.
print("\n=== burn-off of predictive sd through the match ===")
print("(uniform-rate approximation; the real curve is second-half weighted,")
print(" which the live snapshots will pin down)")
lam = within["mean"]
rows = []
for t in (0, 15, 30, 45, 60, 63, 75, 85):
    rem = lam * (90 - t) / 90
    sd_total = np.sqrt(rem + within.sys_var * ((90 - t) / 90) ** 2)
    rows.append({"minute": t, "exp_remaining": round(rem, 2),
                 "sd_of_final_total": round(sd_total, 2),
                 "vs_prematch": f"{sd_total/np.sqrt(lam + within.sys_var):.0%}"})
print(pd.DataFrame(rows).to_string(index=False))

out = {
    "source": "football-data.co.uk, 18 divisions, seasons 2015/16-2024/25",
    "n_matches": int(len(d)),
    "total_corners": {"mean": round(float(y.mean()), 3),
                      "sd": round(float(y.std()), 3),
                      "quantiles": {str(q): int(np.percentile(y, q))
                                    for q in (5, 25, 50, 75, 95)}},
    "variance_budget": {k: round(float(v), 4) for k, v in within.items()},
    "r2_ceiling_match_total": round(float(ceil_r2), 4),
    "model_r2_out_of_sample": {"league_mean": 0.012, "prematch": 0.026,
                               "plus_halftime_scoreline": 0.031},
    "burn_off": rows,
}
p = os.path.join(HERE, "..", "data", "derived", "historical_baseline.json")
json.dump(out, open(p, "w"), indent=2)
print(f"\nwrote {p}")
