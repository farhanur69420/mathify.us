#!/usr/bin/env bash
# Pull season CSVs from football-data.co.uk into corners/data/raw/.
#
# These files carry FINAL corner counts (HC/AC) plus the half-time score
# (HTHG/HTAG) -- a free state snapshot at minute 45 -- and closing odds. They
# carry no in-match timeline, so they establish the pre-match prior and the
# minute-45 scoreline lift, not the per-minute curve. That needs the live
# collector in corners/collect/.
#
# Raw files stay out of git (see .gitignore); we publish derived aggregates.
set -uo pipefail

RAW="$(cd "$(dirname "$0")/.." && pwd)/data/raw"
mkdir -p "$RAW"

# Divisions that reliably carry HC/AC. Top flights plus the English and
# Spanish/Italian/French second tiers, for sample size across corner regimes.
DIVS=(E0 E1 E2 E3 D1 D2 I1 I2 SP1 SP2 F1 F2 N1 B1 P1 T1 G1 SC0)
# 2015/16 through 2024/25.
SEASONS=(1516 1617 1718 1819 1920 2021 2122 2223 2324 2425)

ok=0; miss=0
for s in "${SEASONS[@]}"; do
  for d in "${DIVS[@]}"; do
    out="$RAW/${d}_${s}.csv"
    [ -s "$out" ] && { ok=$((ok+1)); continue; }
    code=$(curl -sL --max-time 60 -w '%{http_code}' \
      "https://www.football-data.co.uk/mmz4281/${s}/${d}.csv" -o "$out")
    if [ "$code" = "200" ] && [ -s "$out" ]; then
      ok=$((ok+1))
    else
      rm -f "$out"; miss=$((miss+1))
      echo "  miss ${d}_${s} (http ${code})" >&2
    fi
  done
done
echo "fetched/present: $ok   missing: $miss   -> $RAW"
