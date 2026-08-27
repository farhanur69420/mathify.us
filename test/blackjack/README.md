# Blackjack engine tests

The engine lives in `public/explore/blackjack-engine/index.html`. These tests
run the real thing: `extract.js` slices the solver out of the shipped page, so
a test can never pass against a stale copy.

```
node extract.js          # regenerate core.js from the page — run this first
```

## Correctness

| script | what it establishes |
|---|---|
| `test-chart.js` | Generates the full 6-deck S17 DAS chart from the solver. Must match the published chart cell for cell, across hard totals, soft totals and pairs. |
| `test2.js` | H17 and late-surrender cells, the European no-hole-card changes, and count deviations emerging at the right true counts. |
| `test3.js` | Pair-splitting rows under DAS / no-DAS / DAS-restricted-to-10-11, each against its own published chart. Also times the worst-case cells. |
| `mc.js` | Independent 2M-hand Monte Carlo for stand and double EVs. Agrees with the solver to within sampling error. |
| `exact-edge.js` | Exact house edge by enumerating every opening deal. Used to identify Stake's rule set from its published RTP, and to check the rule-effect approximation. |

## Statistics behind the deck-integrity audit

| script | what it establishes |
|---|---|
| `stats.js` | Chi-square and normal tail functions against published critical values, plus false-positive calibration on simulated fair shoes. |
| `power.js` | Detection power of the omnibus and targeted tests, and the sample size each distortion needs. |

## End-to-end play

`sim.js` is a blackjack game — dealer, shoe, splits, payouts — written from
scratch and sharing no code with the engine. The only thing crossing over is
`evaluate(...).best.id`, called on exactly the multiset the page itself builds.

| script | what it establishes |
|---|---|
| `run-csm.js` | Quick pilot with a published-chart control and a mimic-the-dealer control. |
| `run-big.js` | Deals identical shoes to the engine and to the published chart. The paired difference isolates whether the engine gives up any EV. |
| `run-live.js` | Real shoe, cut card, count tracking. Reports realised EV bucketed by true count. |
| `record.js` + `bet-schemes.js` | Records one stream of hands, then replays betting schemes over it. Since the bet cannot change the cards and net scales linearly with the stake, this is an exact paired comparison. |
| `tcdist.js` | The analytic true-count distribution used by the bankroll panel, checked against the recorded streams. |

## Results at the time of writing

- Engine vs published basic strategy, 2,000,000 paired hands: **−0.0021% ± 0.024%**. The
  input-to-decision path costs no measurable EV.
- Realised house edge 0.4974% ± 0.159% against 0.53% predicted at the time; the exact
  enumeration later put the correct figure at 0.5723%.
- Mimic-the-dealer control: −5.98%, against a published ≈ −5.5%. The harness detects bad play.
- Counting: realised EV rises monotonically with true count in both a 50%-penetration
  8-deck game and a 75%-penetration 6-deck game.
- A 1–12 spread earns +0.0281 ± 0.0120 units/hand at 6 decks and 75% penetration, and
  −0.0070 ± 0.0071 at 8 decks and 50%. Deep penetration is what makes counting pay.
- Martingale drops EV per unit wagered from −0.250% to −1.700% and ruins 43% of sessions.
  Stacked on the count ramp it ruins 54.7% and its median session ends at zero.
