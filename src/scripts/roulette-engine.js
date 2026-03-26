/* ── European Roulette Betting Calculator Engine ── */

(function () {
  'use strict';

  // ── CONSTANTS ──
  const REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const BLACKS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
  const TOTAL_NUMBERS = 37; // 0-36

  // ── CATEGORY HELPERS ──
  function getColor(n) {
    if (n === 0) return 'green';
    return REDS.includes(n) ? 'red' : 'black';
  }
  function getParity(n) {
    return n === 0 ? null : (n % 2 === 1 ? 'odd' : 'even');
  }
  function getHalf(n) {
    return n === 0 ? null : (n <= 18 ? 'low' : 'high');
  }
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

  // ── GAME STATE ──
  function createState() {
    return {
      startingBalance: 0,
      balance: 0,
      history: [],
      consecutiveLosses: 0,
      betTypeLosses: {},
      recoveryMode: false,
      lastSuggestions: [],
      acceptedBets: [],
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
      },
      stopped: false,
      stopReason: null,
    };
  }

  var state = createState();

  // ── CORE API ──

  function initGame(startingBalance) {
    state = createState();
    state.startingBalance = startingBalance;
    state.balance = startingBalance;
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

  // ── ANALYSIS ──

  function analyzeHistory() {
    var recent = getRecentHistory();
    var counts = {
      red: 0, black: 0,
      odd: 0, even: 0,
      low: 0, high: 0,
      dozen1: 0, dozen2: 0, dozen3: 0,
      col1: 0, col2: 0, col3: 0,
    };
    var nonZero = 0;

    for (var i = 0; i < recent.length; i++) {
      var c = classifyNumber(recent[i]);
      if (c.color === 'red') counts.red++;
      if (c.color === 'black') counts.black++;
      if (c.parity === 'odd') counts.odd++;
      if (c.parity === 'even') counts.even++;
      if (c.half === 'low') counts.low++;
      if (c.half === 'high') counts.high++;
      if (c.dozen === 1) counts.dozen1++;
      if (c.dozen === 2) counts.dozen2++;
      if (c.dozen === 3) counts.dozen3++;
      if (c.column === 1) counts.col1++;
      if (c.column === 2) counts.col2++;
      if (c.column === 3) counts.col3++;
      if (recent[i] !== 0) nonZero++;
    }

    return { counts: counts, total: recent.length, nonZero: nonZero };
  }

  // ── BET SUGGESTION ENGINE ──

  function getBaseBet() {
    return Math.max(1, Math.round(state.balance * 0.03));
  }

  function calcConfidence(observed, expected, total) {
    if (total < 3) return 40;
    var deviation = Math.abs(observed - expected);
    var score = Math.min(95, Math.round(50 + (deviation / Math.max(expected, 0.1)) * 80));
    return Math.max(35, score);
  }

  function generateSuggestions() {
    var analysis = analyzeHistory();
    var recent = getRecentHistory();
    var baseBet = getBaseBet();
    var maxTotal = Math.floor(state.balance * 0.25);
    var suggestions = [];

    if (recent.length < 1) {
      return [{
        type: 'even-money',
        bet: 'Red',
        betKey: 'red',
        amount: Math.min(baseBet, maxTotal),
        confidence: 50,
        reasoning: 'No history yet — default suggestion.',
      }];
    }

    // Expected frequencies in 15 spins (accounting for 0)
    var evenExpected = (recent.length * 18) / TOTAL_NUMBERS;
    var dozenExpected = (recent.length * 12) / TOTAL_NUMBERS;
    var colExpected = (recent.length * 12) / TOTAL_NUMBERS;

    // ── EVEN-MONEY PICK ──
    var evenOptions = [
      { bet: 'Red', betKey: 'red', opp: 'black', count: analysis.counts.red, oppCount: analysis.counts.black },
      { bet: 'Black', betKey: 'black', opp: 'red', count: analysis.counts.black, oppCount: analysis.counts.red },
      { bet: 'Odd', betKey: 'odd', opp: 'even', count: analysis.counts.odd, oppCount: analysis.counts.even },
      { bet: 'Even', betKey: 'even', opp: 'odd', count: analysis.counts.even, oppCount: analysis.counts.odd },
      { bet: '1-18', betKey: 'low', opp: 'high', count: analysis.counts.low, oppCount: analysis.counts.high },
      { bet: '19-36', betKey: 'high', opp: 'low', count: analysis.counts.high, oppCount: analysis.counts.low },
    ];

    // Sort by which category is most under-represented (cold = bet on it)
    evenOptions.sort(function (a, b) {
      return a.count - b.count;
    });

    var evenPick = evenOptions[0];

    // Check consecutive losses on this bet type — switch after 2
    var betLosses = state.betTypeLosses[evenPick.betKey] || 0;
    if (betLosses >= 2) {
      // Switch to opposite
      var switched = evenOptions.find(function (o) { return o.betKey === evenPick.opp; });
      if (switched) evenPick = switched;
    }

    var evenConfidence = calcConfidence(evenPick.count, evenExpected, recent.length);

    // ── DOZEN/COLUMN PICK ──
    var groupOptions = [
      { bet: '1st Dozen (1-12)', betKey: 'dozen1', count: analysis.counts.dozen1 },
      { bet: '2nd Dozen (13-24)', betKey: 'dozen2', count: analysis.counts.dozen2 },
      { bet: '3rd Dozen (25-36)', betKey: 'dozen3', count: analysis.counts.dozen3 },
      { bet: 'Column 1', betKey: 'col1', count: analysis.counts.col1 },
      { bet: 'Column 2', betKey: 'col2', count: analysis.counts.col2 },
      { bet: 'Column 3', betKey: 'col3', count: analysis.counts.col3 },
    ];

    groupOptions.sort(function (a, b) { return a.count - b.count; });
    var groupPick = groupOptions[0];

    var groupBetLosses = state.betTypeLosses[groupPick.betKey] || 0;
    if (groupBetLosses >= 2) {
      // Switch: pick the next coldest that we haven't lost 2 on
      for (var g = 1; g < groupOptions.length; g++) {
        if ((state.betTypeLosses[groupOptions[g].betKey] || 0) < 2) {
          groupPick = groupOptions[g];
          break;
        }
      }
    }

    var groupConfidence = calcConfidence(groupPick.count, dozenExpected, recent.length);

    // ── AMOUNT CALCULATION ──
    var evenAmount = baseBet;
    var groupAmount = baseBet;

    // Recovery mode: 5% of balance
    if (state.recoveryMode) {
      var recoveryBet = Math.max(1, Math.round(state.balance * 0.05));
      evenAmount = recoveryBet;
      groupAmount = Math.round(recoveryBet * 0.6);
    } else {
      // Scaled Martingale on per-type losses
      var evenTypeLosses = state.betTypeLosses[evenPick.betKey] || 0;
      var groupTypeLosses = state.betTypeLosses[groupPick.betKey] || 0;

      evenAmount = Math.round(baseBet * Math.pow(1.8, Math.min(evenTypeLosses, 4)));
      groupAmount = Math.round(baseBet * Math.pow(1.8, Math.min(groupTypeLosses, 4)));
    }

    // Enforce 25% cap
    var total = evenAmount + groupAmount;
    if (total > maxTotal) {
      var ratio = maxTotal / total;
      evenAmount = Math.max(1, Math.round(evenAmount * ratio));
      groupAmount = Math.max(1, Math.round(groupAmount * ratio));
    }

    // Build reasoning
    var evenReason = evenPick.bet + ' appeared ' + evenPick.count + '/' + recent.length +
      ' times (expected ~' + evenExpected.toFixed(1) + '). ' +
      (state.recoveryMode ? 'Recovery mode: reduced bet.' :
        (evenTypeLosses > 0 ? 'Martingale x' + (evenTypeLosses + 1) + '.' : 'Base bet.'));

    var groupReason = groupPick.bet + ' appeared ' + groupPick.count + '/' + recent.length +
      ' times (expected ~' + dozenExpected.toFixed(1) + '). Pays 2:1.' +
      (state.recoveryMode ? ' Recovery mode.' : '');

    suggestions.push({
      type: 'even-money',
      bet: evenPick.bet,
      betKey: evenPick.betKey,
      amount: evenAmount,
      confidence: evenConfidence,
      reasoning: evenReason,
      payout: 1,
    });

    suggestions.push({
      type: 'dozen/column',
      bet: groupPick.bet,
      betKey: groupPick.betKey,
      amount: groupAmount,
      confidence: groupConfidence,
      reasoning: groupReason,
      payout: 2,
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
        totalWinAmount += bet.amount + payout; // return + profit
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

    // Update stats
    state.stats.totalBet += totalBetAmount;
    var netProfit = totalWinAmount - totalBetAmount;

    if (anyWin) {
      state.stats.wins++;
      state.stats.totalWon += totalWinAmount;
      if (netProfit > state.stats.biggestWin) state.stats.biggestWin = netProfit;
      state.stats.currentStreak = Math.max(0, state.stats.currentStreak) + 1;
      if (state.stats.currentStreak > state.stats.bestStreak) state.stats.bestStreak = state.stats.currentStreak;
      state.stats.currentLoseStreak = 0;

      // Win: reset
      state.consecutiveLosses = 0;
      state.recoveryMode = false;
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

      // Loss: increment
      state.consecutiveLosses++;
      for (var l = 0; l < acceptedBets.length; l++) {
        if (!doesBetWin(acceptedBets[l].betKey, landedNumber)) {
          state.betTypeLosses[acceptedBets[l].betKey] = (state.betTypeLosses[acceptedBets[l].betKey] || 0) + 1;
        }
      }

      // 3+ consecutive losses → recovery mode
      if (state.consecutiveLosses >= 3) {
        state.recoveryMode = true;
      }
    }

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
      recoveryMode: state.recoveryMode,
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
    };
  }

  function getState() {
    return state;
  }

  function forceResume() {
    state.stopped = false;
    state.stopReason = null;
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
  };
})();
