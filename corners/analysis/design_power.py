"""Which capture design gets the most out of a fixed number of screenshots?

Two candidate designs, costed in images:
  SPARSE  one mid-match capture (3 images) + full time (1 image) = 4/match
  DENSE   k mid-match captures (3 each)    + full time (1)       = 3k+1

At a fixed image budget, sparse buys more matches and dense buys more intervals
per match. Which wins is not obvious: match-to-match rate spread favours
breadth, but within-match contrasts identify a state effect free of the
match's own rate level, which favours depth.

Simulated truth: corner arrivals with a second-half-weighted time shape, a
latent per-match rate, and a state effect from the scoreline being within one
goal. We then observe ONLY what each design would actually see -- corner counts
between consecutive captures, with the state read at the interval start -- and
fit a Poisson GLM with a log-exposure offset.
"""
import numpy as np
from sklearn.linear_model import PoissonRegressor

RNG = np.random.default_rng(11)
BASE = 9.899 / 90.0
LAM_SD = 1.23 / 9.899
GOAL_RATE = 2.7 / 90.0

def time_shape(t):
    """Second-half weighted: rate rises ~40% from kickoff to the late phase."""
    return 0.8 + 0.4 * (t / 90.0) ** 1.5 / 1.0 * 2.0

def one_match(beta):
    scale = np.exp(RNG.normal(0, LAM_SD))
    # goal times -> margin path -> state path, on a 1-minute grid
    ng = RNG.poisson(GOAL_RATE * 90)
    gt = np.sort(RNG.uniform(0, 90, ng))
    gs = RNG.choice([1, -1], ng)
    margin = np.zeros(91)
    for t, s in zip(gt, gs):
        margin[int(t):] += s
    state = (np.abs(margin) <= 1).astype(float)
    rate = BASE * scale * time_shape(np.arange(91)) * np.exp(beta * state)
    corners = RNG.poisson(rate)          # per-minute counts
    return corners, state

def observe(corners, state, cuts):
    """cuts: mid-match capture minutes. Returns (count, exposure, state) rows
    for every interval the design can see, including the run to full time."""
    rows, edges = [], [0] + list(cuts) + [90]
    for a, b in zip(edges[:-1], edges[1:]):
        rows.append((corners[a:b].sum(), b - a, state[a]))
    return rows

def power(design_cuts, n_matches, beta, reps=120):
    ests = []
    for _ in range(reps):
        X, y, off = [], [], []
        for _ in range(n_matches):
            c, s = one_match(beta)
            cuts = sorted(RNG.choice(design_cuts, len(design_cuts),
                                     replace=False)) if len(design_cuts) > 1 \
                   else [int(RNG.integers(25, 86))]
            for k, expo, st in observe(c, s, cuts):
                X.append([st, (90 - expo) / 90.0]); y.append(k); off.append(expo)
        X, y, off = np.array(X), np.array(y), np.array(off)
        m = PoissonRegressor(alpha=1e-6, max_iter=4000)
        # exposure offset via sample weights on the rate scale
        m.fit(X, y / off, sample_weight=off)
        ests.append(m.coef_[0])
    ests = np.array(ests)
    sd = ests.std()
    return sd, float(np.mean(np.abs(ests) > 1.96 * sd)), ests.mean()

BUDGET = 160
DESIGNS = {
    "SPARSE 1 mid + FT":  ([0], 4),
    "DENSE  3 mid + FT":  ([35, 55, 72], 10),
    "DENSE  5 mid + FT":  ([25, 40, 55, 68, 80], 16),
}
TRUE = np.log(1.30)
print(f"image budget = {BUDGET}   true effect = x1.30 (beta={TRUE:.3f})\n")
print(f"{'design':<22}{'matches':>8}{'rows':>7}{'sd(est)':>10}{'power':>8}{'mean est':>10}")
for name, (cuts, cost) in DESIGNS.items():
    n = BUDGET // cost
    sd, pw, mu = power(cuts, n, TRUE)
    rows = n * (len(cuts) + 1)
    print(f"{name:<22}{n:>8}{rows:>7}{sd:>10.3f}{pw:>8.0%}{mu:>10.3f}")
