"""Load the football-data.co.uk season CSVs into one tidy match table.

Keeps only matches with a complete corner record. Adds the minute-45 state
(half-time goals) and pre-match market implied probabilities, which are the two
things in this source that let us ask an information-value question at all.
"""
import glob, os, sys
import numpy as np
import pandas as pd

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
NEED = ["HomeTeam", "AwayTeam", "FTHG", "FTAG", "HTHG", "HTAG", "HC", "AC"]

def load():
    frames = []
    for path in sorted(glob.glob(os.path.join(RAW, "*.csv"))):
        div, season = os.path.basename(path)[:-4].rsplit("_", 1)
        try:
            df = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip",
                             low_memory=False)
        except Exception as e:
            print(f"  skip {div}_{season}: {e}", file=sys.stderr)
            continue
        df.columns = [c.strip().lstrip("﻿") for c in df.columns]
        if not all(c in df.columns for c in NEED):
            continue
        keep = NEED + [c for c in ("HS", "AS", "HST", "AST", "HF", "AF",
                                   "HY", "AY", "HR", "AR", "Date",
                                   "B365H", "B365D", "B365A") if c in df.columns]
        sub = df[keep].copy()
        sub["division"], sub["season"] = div, season
        frames.append(sub)
    out = pd.concat(frames, ignore_index=True)
    for c in out.columns:
        if c not in ("HomeTeam", "AwayTeam", "Date", "division", "season"):
            out[c] = pd.to_numeric(out[c], errors="coerce")
    out = out.dropna(subset=NEED[2:]).reset_index(drop=True)
    out["corners_total"] = out.HC + out.AC
    out["ht_margin"] = out.HTHG - out.HTAG
    out["ht_goals"] = out.HTHG + out.HTAG
    # Market implied probabilities, de-vigged proportionally.
    if {"B365H", "B365D", "B365A"} <= set(out.columns):
        inv = 1.0 / out[["B365H", "B365D", "B365A"]]
        out["p_home"], out["p_draw"], out["p_away"] = (inv.T / inv.sum(axis=1)).T.values.T
        # Pre-match expected dominance: how lopsided the tie is.
        out["mismatch"] = (out.p_home - out.p_away).abs()
    return out

if __name__ == "__main__":
    d = load()
    d.to_csv(os.path.join(os.path.dirname(__file__), "..", "data",
                            "raw", "matches.csv"), index=False)
    print(f"matches with full corner record: {len(d):,}")
    print(f"divisions: {d.division.nunique()}   seasons: {d.season.nunique()}")
    print(f"\ntotal corners  mean={d.corners_total.mean():.2f}  "
          f"sd={d.corners_total.std():.2f}  "
          f"var/mean={d.corners_total.var()/d.corners_total.mean():.2f}")
    print(f"quantiles 5/25/50/75/95: "
          f"{np.percentile(d.corners_total,[5,25,50,75,95]).astype(int)}")
    print("\nper-division mean total corners:")
    print(d.groupby('division').corners_total.agg(['mean','std','count'])
           .sort_values('mean', ascending=False).round(2).to_string())
