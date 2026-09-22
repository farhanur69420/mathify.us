"""How much corner variance is predictable before kickoff, and what does
in-match state add?

The pre-match ceiling is the number that sets expectations for the whole
project: if corners are mostly irreducible noise, then even a perfect live
model has a small target, and any claimed edge needs to clear that bar.

Team corner rates are built from PRIOR matches only (expanding mean, shrunk to
the league mean). Using season aggregates would leak the outcome into the
feature and inflate every number here.

Models, each adding one layer of information:
  M0  global mean                         -- no information
  M1  league mean                         -- competition regime
  M2  + team rolling corner rates + odds  -- everything known at kickoff
  M3  + half-time scoreline               -- minute-45 state (scoreline only)
"""
import os
import numpy as np
import pandas as pd
from sklearn.linear_model import PoissonRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error

HERE = os.path.dirname(__file__)
PRIOR_W = 8.0   # pseudo-matches of shrinkage toward the league mean

d = pd.read_csv(os.path.join(HERE, "..", "data", "raw", "matches.csv"),
                low_memory=False)
d["season"] = d.season.astype(str).str.zfill(4)
d["Date"] = pd.to_datetime(d.Date, dayfirst=True, errors="coerce",
                           format="mixed")
d = d.dropna(subset=["Date"]).sort_values("Date").reset_index(drop=True)

league_mean = d.groupby("division").corners_total.transform("mean") / 2.0

# ---- rolling, leak-free team corner rates -------------------------------
for_sum, for_n, ag_sum, ag_n = {}, {}, {}, {}
cols = {k: np.zeros(len(d)) for k in
        ("h_for", "h_against", "a_for", "a_against")}

for i, r in enumerate(d.itertuples(index=False)):
    lm = league_mean.iloc[i]
    for side, team, fc, ac in (("h", r.HomeTeam, r.HC, r.AC),
                               ("a", r.AwayTeam, r.AC, r.HC)):
        key = (r.division, team)
        cols[f"{side}_for"][i] = ((for_sum.get(key, 0.0) + PRIOR_W * lm) /
                                  (for_n.get(key, 0) + PRIOR_W))
        cols[f"{side}_against"][i] = ((ag_sum.get(key, 0.0) + PRIOR_W * lm) /
                                      (ag_n.get(key, 0) + PRIOR_W))
        for_sum[key] = for_sum.get(key, 0.0) + fc
        for_n[key] = for_n.get(key, 0) + 1
        ag_sum[key] = ag_sum.get(key, 0.0) + ac
        ag_n[key] = ag_n.get(key, 0) + 1

for k, v in cols.items():
    d[k] = v
d["exp_total"] = (d.h_for + d.a_against) / 2 + (d.a_for + d.h_against) / 2
d["league_exp"] = league_mean * 2
d["abs_ht_margin"] = d.ht_margin.abs()

FEAT = {
    "M1 league mean":            ["league_exp"],
    "M2 + team rates & odds":    ["league_exp", "exp_total", "h_for", "h_against",
                                  "a_for", "a_against", "mismatch", "p_draw"],
    "M3 + half-time scoreline":  ["league_exp", "exp_total", "h_for", "h_against",
                                  "a_for", "a_against", "mismatch", "p_draw",
                                  "ht_margin", "abs_ht_margin", "ht_goals"],
}

test = d.season.isin(["2324", "2425"])
tr, te = d[~test], d[test]
y_tr, y_te = tr.corners_total.values, te.corners_total.values
print(f"train {len(tr):,}   test {len(te):,}\n")

base = np.sqrt(mean_squared_error(y_te, np.full(len(y_te), y_tr.mean())))
var_te = y_te.var()
print(f"{'model':<28}{'RMSE':>8}{'R2 vs mean':>12}{'sd cut':>9}")
print(f"{'M0 global mean':<28}{base:>8.3f}{0.0:>12.1%}{'--':>9}")

rows = [("M0 global mean", base, 0.0)]
for name, fs in FEAT.items():
    Xtr = tr[fs].apply(pd.to_numeric, errors="coerce")
    Xte = te[fs].apply(pd.to_numeric, errors="coerce")
    med = Xtr.median()
    Xtr, Xte = Xtr.fillna(med).values, Xte.fillna(med).values
    preds = []
    for m in (PoissonRegressor(alpha=1e-4, max_iter=2000),
              HistGradientBoostingRegressor(loss="poisson", max_depth=3,
                                            learning_rate=0.05,
                                            max_iter=400, random_state=0)):
        m.fit(Xtr, y_tr)
        preds.append(m.predict(Xte))
    p = np.mean(preds, axis=0)
    rmse = np.sqrt(mean_squared_error(y_te, p))
    r2 = 1 - rmse**2 / var_te
    print(f"{name:<28}{rmse:>8.3f}{r2:>12.1%}{(base-rmse)/base:>8.1%}")
    rows.append((name, rmse, r2))

print(f"\nirreducible sd floor if corners were pure Poisson(9.9): "
      f"{np.sqrt(9.9):.2f}")
print(f"observed sd: {d.corners_total.std():.2f}")
