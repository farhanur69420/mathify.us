/* ── European Roulette Betting Calculator Engine V2 ── */
/* Adaptive · Statistical · Coverage-Optimized */

(function () {
  'use strict';

  // ── CONSTANTS ──
  var REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  var BLACKS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
  var TOTAL_NUMBERS = 37;

  // European wheel physical order (for sector analysis)
  var WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

  // Fibonacci sequence for fallback betting
  var FIBONACCI = [1,1,2,3,5,8,13,21,34,55,89,144];

  // Analysis windows (multi-timeframe)
  var WINDOWS = [5, 10, 15, 25, 50];

  // Tier thresholds based on balance ratio
  var TIERS = [
    { name: 'CONSERVATIVE', minRatio: 0.80, betPct: 0.02, maxPct: 0.10, color: '#27ae60' },
    { name: 'STANDARD',     minRatio: 0.60, betPct: 0.035, maxPct: 0.15, color: '#c9a84c' },
    { name: 'AGGRESSIVE',   minRatio: 0.40, betPct: 0.055, maxPct: 0.22, color: '#e67e22' },
    { name: 'CRITICAL',     minRatio: 0.25, betPct: 0.08,  maxPct: 0.30, color: '#e74c3c' },
    { name: 'SURVIVAL',     minRatio: 0.00, betPct: 0.12,  maxPct: 0.40, color: '#8e44ad' },
  ];

  // ── CATEGORY HELPERS ──
  function getColor(n) {
    if (n === 0) return 'green';
    return REDS.includes(n) ? 'red' : 'black';
  }
  function getParity(n) { return n === 0 ? null : (n % 2 === 1 ? 'odd' : 'even'); }
  function getHalf(n) { return n === 0 ? null : (n <= 18 ? 'low' : 'high'); }
  function getDozen(n) {
    if (n === 0) return null;
    if (n <= 12) return 1;
    if (n <= 24) return 2;
    return 3;
  }
  function getColumn(n) {
    if (n === 0) return null;
    return ((n - 1) % 3) + 1;
  }

  function classifyNumber(n) {
    return {
      color: getColor(n),
      parity: getParity(n),
      half: getHalf(n),
      dozen: getDozen(n),
      column: getColumn(n),
    };
  }

  // ── STATISTICAL FUNCTIONS ──

  // Z-score: how many std deviations observed is from expected
  function zScore(observed, n, p) {
    if (n < 2) return 0;
    var expected = n * p;
    var stdDev = Math.sqrt(n * p * (1 - p));
    if (stdDev === 0) return 0;
    return (observed - expected) / stdDev;
  }

  // Chi-squared goodness-of-fit for a set of categories
  function chiSquared(observedArr, expectedArr) {
    var chi2 = 0;
    for (var i = 0; i < observedArr.length; i++) {
      if (expectedArr[i] > 0) {
        var diff = observedArr[i] - expectedArr[i];
        chi2 += (diff * diff) / expectedArr[i];
      }
    }
    return chi2;
  }

  // Linear regression slope (momentum indicator)
  function linearSlope(values) {
    var n = values.length;
    if (n < 3) return 0;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    var denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  // Count categories in a window of numbers
  function countCategories(nums) {
    var c = {
      red: 0, black: 0, green: 0,
      odd: 0, even: 0,
      low: 0, high: 0,
      dozen1: 0, dozen2: 0, dozen3: 0,
      col1: 0, col2: 0, col3: 0,
    };
    var nonZero = 0;
    for (var i = 0; i < nums.length; i++) {
      var cl = classifyNumber(nums[i]);
      if (cl.color === 'red') c.red++;
      else if (cl.color === 'black') c.black++;
      else c.green++;
      if (cl.parity === 'odd') c.odd++;
      if (cl.parity === 'even') c.even++;
      if (cl.half === 'low') c.low++;
      if (cl.half === 'high') c.high++;
      if (cl.dozen === 1) c.dozen1++;
      if (cl.dozen === 2) c.dozen2++;
      if (cl.dozen === 3) c.dozen3++;
      if (cl.column === 1) c.col1++;
      if (cl.column === 2) c.col2++;
      if (cl.column === 3) c.col3++;
      if (nums[i] !== 0) nonZero++;
    }
    return { counts: c, total: nums.length, nonZero: nonZero };
  }

  // Multi-window analysis: run analysis across multiple window sizes
  function multiWindowAnalysis(history) {
    var results = {};
    for (var w = 0; w < WINDOWS.length; w++) {
      var size = WINDOWS[w];
      var slice = history.slice(-size);
      if (slice.length < 2) continue;
      results[size] = countCategories(slice);
      results[size].windowSize = size;
    }
    return results;
  }

  // Detect streaks in history for a given category test function
  function detectStreaks(history, testFn) {
    var current = 0;
    var max = 0;
    var streaks = [];
    for (var i = 0; i < history.length; i++) {
      if (testFn(history[i])) {
        current++;
        if (current > max) max = current;
      } else {
        if (current > 0) streaks.push(current);
        current = 0;
      }
    }
    if (current > 0) streaks.push(current);
    return { current: current, max: max, streaks: streaks };
  }

  // Sector analysis: find hot/cold sectors on the physical wheel
  function sectorAnalysis(history, sectorSize) {
    if (!sectorSize) sectorSize = 5;
    var recent = history.slice(-30);
    var sectorHits = {};
    // Build sectors from wheel order
    for (var s = 0; s < WHEEL_ORDER.length; s++) {
      var sectorNums = [];
      for (var j = 0; j < sectorSize; j++) {
        sectorNums.push(WHEEL_ORDER[(s + j) % WHEEL_ORDER.length]);
      }
      var key = sectorNums.join(',');
      var hits = 0;
      for (var h = 0; h < recent.length; h++) {
        if (sectorNums.indexOf(recent[h]) !== -1) hits++;
      }
      sectorHits[key] = { nums: sectorNums, hits: hits, center: WHEEL_ORDER[(s + Math.floor(sectorSize / 2)) % WHEEL_ORDER.length] };
    }
    // Find hottest and coldest
    var sorted = Object.keys(sectorHits).sort(function(a, b) {
      return sectorHits[b].hits - sectorHits[a].hits;
    });
    return {
      hottest: sorted.length > 0 ? sectorHits[sorted[0]] : null,
      coldest: sorted.length > 0 ? sectorHits[sorted[sorted.length - 1]] : null,
      all: sectorHits,
    };
  }

  // ── GAME STATE ──
  function createState() {
    return {
      startingBalance: 0,
      balance: 0,
      history: [],
      consecutiveLosses: 0,
      betTypeLosses: {},
      lastSuggestions: [],
      acceptedBets: [],
      tier: TIERS[0],
      momentum: 0,
      fibIndex: 0,
      stats: {
        wins: 0,
        losses: 0,
        pushes: 0,
        totalBet: 0,
        totalWon: 0,
        biggestWin: 0,
        currentStreak: 0,
        bestStreak: 0,
        worstStreak: 0,
        currentLoseStreak: 0,
        peakBalance: 0,
        valleyBalance: Infinity,
        roundHistory: [], // track net P/L per round for momentum
      },
      stopped: false,
      stopReason: null,
    };
  }

  var state = createState();

  // ── TIER SYSTEM ──

  function calculateTier() {
    if (state.startingBalance === 0) return TIERS[0];
    var ratio = state.balance / state.startingBalance;
    for (var i = 0; i < TIERS.length; i++) {
      if (ratio >= TIERS[i].minRatio) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  // Momentum: slope of recent P/L results (-1 to +1 normalized)
  function calculateMomentum() {
    var rounds = state.stats.roundHistory;
    if (rounds.length < 3) return 0;
    var recent = rounds.slice(-10);
    // Convert to cumulative for slope
    var cumulative = [];
    var sum = 0;
    for (var i = 0; i < recent.length; i++) {
      sum += recent[i];
      cumulative.push(sum);
    }
    var slope = linearSlope(cumulative);
    // Normalize to -1..1 range based on balance scale
    var scale = Math.max(state.startingBalance * 0.05, 1);
    return Math.max(-1, Math.min(1, slope / scale));
  }

  // ── BET SIZING ──

  function getAdaptiveBaseBet() {
    var tier = state.tier;
    var base = Math.max(1, Math.round(state.balance * tier.betPct));
    var momentum = state.momentum;

    // Momentum adjustment: losing momentum → increase bet to recover faster
    // Winning momentum → slight increase to capitalize
    if (momentum < -0.3) {
      // Losing: scale up aggressively
      base = Math.round(base * (1 + Math.abs(momentum) * 0.8));
    } else if (momentum > 0.3) {
      // Winning: slight bump
      base = Math.round(base * (1 + momentum * 0.3));
    }

    return Math.max(1, base);
  }

  function calculateBetAmount(betKey, baseBet) {
    var tier = state.tier;
    var maxBet = Math.floor(state.balance * tier.maxPct);
    var losses = state.betTypeLosses[betKey] || 0;
    var amount = baseBet;

    if (losses === 0) {
      amount = baseBet;
    } else if (tier.name === 'SURVIVAL' || tier.name === 'CRITICAL') {
      // In critical/survival: use Fibonacci progression (safer than Martingale)
      var fibIdx = Math.min(losses, FIBONACCI.length - 1);
      amount = Math.round(baseBet * FIBONACCI[fibIdx]);
    } else {
      // Standard: scaled Martingale with tier-adaptive multiplier
      var mult = tier.name === 'AGGRESSIVE' ? 2.0 : 1.8;
      amount = Math.round(baseBet * Math.pow(mult, Math.min(losses, 5)));
    }

    // Hard cap
    amount = Math.min(amount, maxBet);
    amount = Math.max(1, amount);
    return amount;
  }

  // ── SCORING & RANKING ──

  // Score all possible bets using multi-window z-scores
  function scoreAllBets(multiAnalysis) {
    var allBets = [];

    // Even-money bets
    var evenMoney = [
      { bet: 'Red',   betKey: 'red',   opp: 'black', prob: 18/37, payout: 1 },
      { bet: 'Black', betKey: 'black', opp: 'red',   prob: 18/37, payout: 1 },
      { bet: 'Odd',   betKey: 'odd',   opp: 'even',  prob: 18/37, payout: 1 },
      { bet: 'Even',  betKey: 'even',  opp: 'odd',   prob: 18/37, payout: 1 },
      { bet: '1-18',  betKey: 'low',   opp: 'high',  prob: 18/37, payout: 1 },
      { bet: '19-36', betKey: 'high',  opp: 'low',   prob: 18/37, payout: 1 },
    ];

    // Dozen/column bets
    var groupBets = [
      { bet: '1st Dozen (1-12)',  betKey: 'dozen1', prob: 12/37, payout: 2 },
      { bet: '2nd Dozen (13-24)', betKey: 'dozen2', prob: 12/37, payout: 2 },
      { bet: '3rd Dozen (25-36)', betKey: 'dozen3', prob: 12/37, payout: 2 },
      { bet: 'Column 1',          betKey: 'col1',   prob: 12/37, payout: 2 },
      { bet: 'Column 2',          betKey: 'col2',   prob: 12/37, payout: 2 },
      { bet: 'Column 3',          betKey: 'col3',   prob: 12/37, payout: 2 },
    ];

    var allOptions = evenMoney.concat(groupBets);

    for (var i = 0; i < allOptions.length; i++) {
      var opt = allOptions[i];
      var compositeScore = 0;
      var windowCount = 0;
      var details = [];

      // Score across multiple windows
      var windowKeys = Object.keys(multiAnalysis);
      for (var w = 0; w < windowKeys.length; w++) {
        var wSize = parseInt(windowKeys[w], 10);
        var wData = multiAnalysis[wSize];
        var observed = wData.counts[opt.betKey] || 0;
        var z = zScore(observed, wData.total, opt.prob);

        // Negative z = under-represented = due to appear (mean reversion bet)
        // Weight shorter windows more heavily
        var weight = wSize <= 10 ? 2.0 : (wSize <= 20 ? 1.5 : 1.0);
        compositeScore += (-z) * weight;
        windowCount += weight;

        details.push({ window: wSize, observed: observed, expected: (wData.total * opt.prob).toFixed(1), z: z.toFixed(2) });
      }

      if (windowCount > 0) compositeScore /= windowCount;

      // Streak bonus: if the opposite has been hitting a lot, this is "due"
      var streakInfo = detectStreaks(state.history.slice(-20), function(n) {
        return !doesBetWin(opt.betKey, n) && n !== 0;
      });
      if (streakInfo.current >= 3) {
        compositeScore += streakInfo.current * 0.3;
      }

      // Penalty for recent losses on this bet type
      var typeLosses = state.betTypeLosses[opt.betKey] || 0;
      if (typeLosses >= 3) {
        compositeScore -= 0.5; // slight penalty for overplayed losing bet
      }

      // Convert score to confidence (0-100)
      var confidence = Math.round(Math.max(15, Math.min(95, 50 + compositeScore * 15)));

      allBets.push({
        bet: opt.bet,
        betKey: opt.betKey,
        prob: opt.prob,
        payout: opt.payout,
        type: opt.payout === 1 ? 'even-money' : 'dozen/column',
        score: compositeScore,
        confidence: confidence,
        details: details,
        coverage: Math.round(opt.prob * 100),
      });
    }

    // Sort by composite score descending
    allBets.sort(function(a, b) { return b.score - a.score; });
    return allBets;
  }

  // Find the best combination of 2 bets that maximizes coverage
  function generateCoverageCombos(rankedBets) {
    var best = null;
    var bestScore = -Infinity;

    for (var i = 0; i < Math.min(rankedBets.length, 6); i++) {
      for (var j = i + 1; j < Math.min(rankedBets.length, 8); j++) {
        var a = rankedBets[i];
        var b = rankedBets[j];

        // Skip if same category type (don't double up on e.g. red + black)
        if (a.betKey === b.betKey) continue;

        // Calculate combined coverage
        var cov = calculateCombinedCoverage(a.betKey, b.betKey);
        var combinedScore = (a.score + b.score) * 0.5 + cov.coverage * 0.02;

        // Prefer combos that cover different number sets
        if (cov.overlap < 0.5) combinedScore += 0.5;

        // Prefer one even-money + one group bet for balance
        if (a.payout !== b.payout) combinedScore += 0.3;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          best = { primary: a, secondary: b, coverage: cov };
        }
      }
    }

    return best;
  }

  // Calculate how many numbers are covered by two bet types
  function calculateCombinedCoverage(keyA, keyB) {
    var covered = new Set();
    var setA = new Set();
    var setB = new Set();

    for (var n = 0; n <= 36; n++) {
      var winA = doesBetWin(keyA, n);
      var winB = doesBetWin(keyB, n);
      if (winA) { covered.add(n); setA.add(n); }
      if (winB) { covered.add(n); setB.add(n); }
    }

    var overlap = 0;
    setA.forEach(function(n) { if (setB.has(n)) overlap++; });

    return {
      total: covered.size,
      coverage: Math.round((covered.size / TOTAL_NUMBERS) * 100),
      overlap: setA.size > 0 ? overlap / setA.size : 0,
      coveredNumbers: Array.from(covered),
    };
  }

  // Build reasoning string with statistical detail
  function buildReasoning(betData, baseBet, betAmount, tier) {
    var parts = [];
    var bestWindow = betData.details && betData.details.length > 0 ? betData.details[0] : null;

    if (bestWindow) {
      parts.push(betData.bet + ': ' + bestWindow.observed + '/' + bestWindow.window + ' spins (expected ' + bestWindow.expected + ')');
      parts.push('Z-score: ' + bestWindow.z);
    }

    parts.push('Tier: ' + tier.name);

    var losses = state.betTypeLosses[betData.betKey] || 0;
    if (losses > 0) {
      if (tier.name === 'SURVIVAL' || tier.name === 'CRITICAL') {
        parts.push('Fibonacci step ' + (losses + 1));
      } else {
        parts.push('Martingale x' + (losses + 1));
      }
    }

    if (betData.payout === 2) {
      parts.push('Pays 2:1');
    }

    return parts.join(' · ');
  }

  // ── CORE API ──

  function initGame(startingBalance) {
    state = createState();
    state.startingBalance = startingBalance;
    state.balance = startingBalance;
    state.stats.peakBalance = startingBalance;
    state.stats.valleyBalance = startingBalance;
    state.tier = calculateTier();
  }

  function addPreviousNumbers(numbers) {
    for (var i = 0; i < numbers.length; i++) {
      var n = parseInt(numbers[i], 10);
      if (!isNaN(n) && n >= 0 && n <= 36) {
        state.history.push(n);
      }
    }
  }

  function getRecentHistory() {
    return state.history.slice(-15);
  }

  function analyzeHistory() {
    var recent = getRecentHistory();
    return countCategories(recent);
  }

  // ── SUGGESTION ENGINE (V2) ──

  function generateSuggestions() {
    var history = state.history;
    var recent = getRecentHistory();

    if (recent.length < 1) {
      return [{
        type: 'even-money',
        bet: 'Red',
        betKey: 'red',
        amount: Math.max(1, Math.round(state.balance * 0.02)),
        confidence: 50,
        reasoning: 'No history — default conservative bet.',
        payout: 1,
        coverage: 49,
        probability: '48.6%',
        tier: state.tier.name,
      }];
    }

    // Update tier and momentum
    state.tier = calculateTier();
    state.momentum = calculateMomentum();

    var tier = state.tier;
    var momentum = state.momentum;
    var baseBet = getAdaptiveBaseBet();

    // Multi-window analysis
    var multiAnalysis = multiWindowAnalysis(history);

    // Score and rank all bets
    var ranked = scoreAllBets(multiAnalysis);

    // Find optimal 2-bet combination for coverage
    var combo = generateCoverageCombos(ranked);

    if (!combo) {
      // Fallback: just use top 2
      combo = {
        primary: ranked[0],
        secondary: ranked.length > 1 ? ranked[1] : ranked[0],
        coverage: ranked.length > 1
          ? calculateCombinedCoverage(ranked[0].betKey, ranked[1].betKey)
          : { total: 18, coverage: 49, overlap: 0 },
      };
    }

    // Check for auto-switch after 2 consecutive losses on same bet
    var primaryKey = combo.primary.betKey;
    var secondaryKey = combo.secondary.betKey;

    if ((state.betTypeLosses[primaryKey] || 0) >= 3) {
      // Find best alternative not currently losing
      for (var r = 0; r < ranked.length; r++) {
        if (ranked[r].betKey !== primaryKey && ranked[r].betKey !== secondaryKey && (state.betTypeLosses[ranked[r].betKey] || 0) < 2) {
          combo.primary = ranked[r];
          combo.coverage = calculateCombinedCoverage(combo.primary.betKey, secondaryKey);
          break;
        }
      }
    }
    if ((state.betTypeLosses[secondaryKey] || 0) >= 3) {
      for (var r2 = 0; r2 < ranked.length; r2++) {
        if (ranked[r2].betKey !== combo.primary.betKey && ranked[r2].betKey !== secondaryKey && (state.betTypeLosses[ranked[r2].betKey] || 0) < 2) {
          combo.secondary = ranked[r2];
          combo.coverage = calculateCombinedCoverage(combo.primary.betKey, combo.secondary.betKey);
          break;
        }
      }
    }

    // Calculate bet amounts
    var primaryAmount = calculateBetAmount(combo.primary.betKey, baseBet);
    var secondaryAmount = calculateBetAmount(combo.secondary.betKey, Math.round(baseBet * 0.7));

    // Enforce tier max cap
    var maxTotal = Math.floor(state.balance * tier.maxPct);
    var total = primaryAmount + secondaryAmount;
    if (total > maxTotal) {
      var ratio = maxTotal / total;
      primaryAmount = Math.max(1, Math.round(primaryAmount * ratio));
      secondaryAmount = Math.max(1, Math.round(secondaryAmount * ratio));
    }

    // Build suggestions
    var suggestions = [];

    suggestions.push({
      type: combo.primary.type,
      bet: combo.primary.bet,
      betKey: combo.primary.betKey,
      amount: primaryAmount,
      confidence: combo.primary.confidence,
      reasoning: buildReasoning(combo.primary, baseBet, primaryAmount, tier),
      payout: combo.primary.payout,
      coverage: combo.coverage.coverage,
      probability: (combo.primary.prob * 100).toFixed(1) + '%',
      tier: tier.name,
      score: combo.primary.score,
    });

    suggestions.push({
      type: combo.secondary.type,
      bet: combo.secondary.bet,
      betKey: combo.secondary.betKey,
      amount: secondaryAmount,
      confidence: combo.secondary.confidence,
      reasoning: buildReasoning(combo.secondary, baseBet, secondaryAmount, tier),
      payout: combo.secondary.payout,
      coverage: combo.coverage.coverage,
      probability: (combo.secondary.prob * 100).toFixed(1) + '%',
      tier: tier.name,
      score: combo.secondary.score,
    });

    state.lastSuggestions = suggestions;
    return suggestions;
  }

  // ── CHECK IF BET WINS ──

  function doesBetWin(betKey, landedNumber) {
    var c = classifyNumber(landedNumber);
    switch (betKey) {
      case 'red': return c.color === 'red';
      case 'black': return c.color === 'black';
      case 'odd': return c.parity === 'odd';
      case 'even': return c.parity === 'even';
      case 'low': return c.half === 'low';
      case 'high': return c.half === 'high';
      case 'dozen1': return c.dozen === 1;
      case 'dozen2': return c.dozen === 2;
      case 'dozen3': return c.dozen === 3;
      case 'col1': return c.column === 1;
      case 'col2': return c.column === 2;
      case 'col3': return c.column === 3;
      default: return false;
    }
  }

  // ── RESOLVE RESULT ──

  function resolveResult(landedNumber, acceptedBets) {
    state.history.push(landedNumber);

    var totalBetAmount = 0;
    var totalWinAmount = 0;
    var anyWin = false;
    var results = [];

    for (var i = 0; i < acceptedBets.length; i++) {
      var bet = acceptedBets[i];
      totalBetAmount += bet.amount;
      var won = doesBetWin(bet.betKey, landedNumber);

      if (won) {
        var payout = bet.amount * bet.payout;
        totalWinAmount += bet.amount + payout;
        anyWin = true;
        results.push({ bet: bet.bet, won: true, profit: payout });
      } else {
        results.push({ bet: bet.bet, won: false, profit: -bet.amount });
      }
    }

    // Update balance
    state.balance -= totalBetAmount;
    state.balance += totalWinAmount;
    state.balance = Math.round(state.balance);

    // Track peak/valley
    if (state.balance > state.stats.peakBalance) state.stats.peakBalance = state.balance;
    if (state.balance < state.stats.valleyBalance) state.stats.valleyBalance = state.balance;

    // Net P/L for momentum tracking
    var netProfit = totalWinAmount - totalBetAmount;
    state.stats.roundHistory.push(netProfit);

    // Update stats
    state.stats.totalBet += totalBetAmount;

    if (anyWin) {
      state.stats.wins++;
      state.stats.totalWon += totalWinAmount;
      if (netProfit > state.stats.biggestWin) state.stats.biggestWin = netProfit;
      state.stats.currentStreak = Math.max(0, state.stats.currentStreak) + 1;
      if (state.stats.currentStreak > state.stats.bestStreak) state.stats.bestStreak = state.stats.currentStreak;
      state.stats.currentLoseStreak = 0;

      state.consecutiveLosses = 0;
      state.fibIndex = 0;

      // Reset bet type losses for winning types
      for (var w = 0; w < acceptedBets.length; w++) {
        if (doesBetWin(acceptedBets[w].betKey, landedNumber)) {
          state.betTypeLosses[acceptedBets[w].betKey] = 0;
        }
      }
    } else {
      state.stats.losses++;
      state.stats.currentStreak = Math.min(0, state.stats.currentStreak) - 1;
      state.stats.currentLoseStreak++;
      if (state.stats.currentLoseStreak > Math.abs(state.stats.worstStreak)) {
        state.stats.worstStreak = -state.stats.currentLoseStreak;
      }

      state.consecutiveLosses++;
      state.fibIndex = Math.min(state.fibIndex + 1, FIBONACCI.length - 1);

      for (var l = 0; l < acceptedBets.length; l++) {
        if (!doesBetWin(acceptedBets[l].betKey, landedNumber)) {
          state.betTypeLosses[acceptedBets[l].betKey] = (state.betTypeLosses[acceptedBets[l].betKey] || 0) + 1;
        }
      }
    }

    // Update tier and momentum
    state.tier = calculateTier();
    state.momentum = calculateMomentum();

    // Check thresholds
    var stopLoss = Math.round(state.startingBalance * 0.5);
    var target = state.startingBalance * 5;

    if (state.balance <= stopLoss) {
      state.stopped = true;
      state.stopReason = 'stop-loss';
    } else if (state.balance >= target) {
      state.stopped = true;
      state.stopReason = 'target';
    }

    return {
      landedNumber: landedNumber,
      color: getColor(landedNumber),
      results: results,
      netProfit: netProfit,
      anyWin: anyWin,
      balance: state.balance,
      stopped: state.stopped,
      stopReason: state.stopReason,
      tier: state.tier,
      momentum: state.momentum,
    };
  }

  function getSessionStats() {
    var totalGames = state.stats.wins + state.stats.losses;
    return {
      winRate: totalGames > 0 ? Math.round((state.stats.wins / totalGames) * 100) : 0,
      totalSpins: totalGames,
      wins: state.stats.wins,
      losses: state.stats.losses,
      currentStreak: state.stats.currentStreak,
      bestStreak: state.stats.bestStreak,
      worstStreak: state.stats.worstStreak,
      biggestWin: state.stats.biggestWin,
      roi: state.startingBalance > 0
        ? Math.round(((state.balance - state.startingBalance) / state.startingBalance) * 100)
        : 0,
      totalBet: state.stats.totalBet,
      totalWon: state.stats.totalWon,
      peakBalance: state.stats.peakBalance,
      valleyBalance: state.stats.valleyBalance === Infinity ? 0 : state.stats.valleyBalance,
      tier: state.tier.name,
      tierColor: state.tier.color,
      momentum: state.momentum,
      coverage: state.lastSuggestions.length > 0 ? state.lastSuggestions[0].coverage : 0,
    };
  }

  function getState() {
    return state;
  }

  function forceResume() {
    state.stopped = false;
    state.stopReason = null;
  }

  function getBaseBet() {
    return getAdaptiveBaseBet();
  }

  // ── PUBLIC API ──
  window.RouletteEngine = {
    initGame: initGame,
    addPreviousNumbers: addPreviousNumbers,
    getRecentHistory: getRecentHistory,
    analyzeHistory: analyzeHistory,
    generateSuggestions: generateSuggestions,
    resolveResult: resolveResult,
    getSessionStats: getSessionStats,
    getState: getState,
    getColor: getColor,
    classifyNumber: classifyNumber,
    forceResume: forceResume,
    getBaseBet: getBaseBet,
    // V2 extras
    multiWindowAnalysis: multiWindowAnalysis,
    sectorAnalysis: sectorAnalysis,
    calculateTier: calculateTier,
    calculateMomentum: calculateMomentum,
    getTiers: function() { return TIERS; },
  };
})();
