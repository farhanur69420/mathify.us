/**
 * System Bet Balancer Optimizer
 * 
 * Calculates optimal stake distributions for system bets (Trixie, Yankee, Canadian, Heinz)
 * to equalize payouts when exactly one selection loses.
 * 
 * Uses linear algebra (Gaussian elimination) to solve the system of equations.
 */

export interface Selection {
  name: string;
  odds: number;
}

export interface BetCombination {
  selections: number[]; // indices of selections in this combination
  stake: number;
}

export interface OptimizerResult {
  combinations: BetCombination[];
  scenarios: ScenarioResult[];
  metrics: OptimizerMetrics;
}

export interface ScenarioResult {
  scenario: string;
  losingSelection?: number;
  winningCombinations: BetCombination[];
  totalReturn: number;
  profit: number;
}

export interface OptimizerMetrics {
  totalStake: number;
  worstCaseReturn: number;
  bestCaseReturn: number;
  averageReturn: number;
  returnVariance: number;
  breakEvenProbability: number;
  roiIfAllWin: number;
}

/**
 * Generate all combinations of a given size from an array of indices
 */
function generateCombinations(
  indices: number[],
  size: number
): number[][] {
  if (size === 1) {
    return indices.map(i => [i]);
  }
  if (size === indices.length) {
    return [indices];
  }

  const result: number[][] = [];
  for (let i = 0; i <= indices.length - size; i++) {
    const head = indices[i];
    const tail = indices.slice(i + 1);
    const subCombinations = generateCombinations(tail, size - 1);
    for (const combo of subCombinations) {
      result.push([head, ...combo]);
    }
  }
  return result;
}

/**
 * Get all system bet combinations for n selections
 * Returns combinations of size 2, 3, ..., n
 */
function getSystemCombinations(n: number): number[][] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const allCombos: number[][] = [];

  for (let size = 2; size <= n; size++) {
    allCombos.push(...generateCombinations(indices, size));
  }

  return allCombos;
}

/**
 * Calculate the payout for a specific combination given odds
 */
function calculateCombinationPayout(
  combination: number[],
  odds: number[]
): number {
  let payout = 1;
  for (const idx of combination) {
    payout *= odds[idx];
  }
  return payout;
}

/**
 * Solve the system of linear equations using Gaussian elimination
 * Ax = b, where x are the stakes we're solving for
 */
function gaussianElimination(
  A: number[][],
  b: number[]
): number[] | null {
  const n = A.length;
  const m = A[0].length;

  // Create augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let col = 0; col < Math.min(n, m); col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }

    // Swap rows
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    // Check for singular matrix
    if (Math.abs(aug[col][col]) < 1e-10) {
      continue;
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= m; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(m).fill(0);
  for (let i = Math.min(n, m) - 1; i >= 0; i--) {
    let sum = aug[i][m];
    for (let j = i + 1; j < m; j++) {
      sum -= aug[i][j] * x[j];
    }
    if (Math.abs(aug[i][i]) > 1e-10) {
      x[i] = sum / aug[i][i];
    }
  }

  return x;
}

/**
 * Optimize system bet stakes to equalize payouts
 */
export function optimizeSystemBet(
  selections: Selection[],
  bankroll: number,
  targetVariance: number = 0.05 // Allow 5% variance in payouts
): OptimizerResult {
  const n = selections.length;
  const odds = selections.map(s => s.odds);
  const combinations = getSystemCombinations(n);

  // Build the system of equations
  // For each "one-loss" scenario, the payout should be equal
  const equations: number[][] = [];
  const targets: number[] = [];

  // For each scenario where one selection loses
  for (let losingIdx = 0; losingIdx < n; losingIdx++) {
    const equation: number[] = new Array(combinations.length).fill(0);

    // Sum payouts of combinations that don't include the losing selection
    let scenarioTarget = 0;
    for (let comboIdx = 0; comboIdx < combinations.length; comboIdx++) {
      const combo = combinations[comboIdx];
      if (!combo.includes(losingIdx)) {
        const payout = calculateCombinationPayout(combo, odds);
        equation[comboIdx] = payout;
        scenarioTarget = payout; // All winning combos should have same payout
      }
    }

    equations.push(equation);
    targets.push(scenarioTarget);
  }

  // Add constraint: sum of all stakes = bankroll
  const bankrollConstraint = new Array(combinations.length).fill(1);
  equations.push(bankrollConstraint);
  targets.push(bankroll);

  // Solve using least squares (since we have more equations than unknowns)
  let stakes = gaussianElimination(equations, targets);

  if (!stakes) {
    // Fallback: equal distribution
    stakes = new Array(combinations.length).fill(bankroll / combinations.length);
  }

  // Ensure all stakes are non-negative
  stakes = stakes.map(s => Math.max(0, s));

  // Normalize to match bankroll exactly
  const totalStakes = stakes.reduce((a, b) => a + b, 0);
  if (totalStakes > 0) {
    stakes = stakes.map(s => (s / totalStakes) * bankroll);
  }

  // Build result
  const betCombinations: BetCombination[] = combinations.map((combo, idx) => ({
    selections: combo,
    stake: Math.round(stakes[idx] * 100) / 100, // Round to 2 decimals
  }));

  // Calculate scenarios
  const scenarios: ScenarioResult[] = [];

  // Scenarios where one selection loses
  for (let losingIdx = 0; losingIdx < n; losingIdx++) {
    const winningCombos = betCombinations.filter(
      bet => !bet.selections.includes(losingIdx)
    );

    const totalReturn = winningCombos.reduce((sum, bet) => {
      const payout = calculateCombinationPayout(bet.selections, odds);
      return sum + bet.stake * payout;
    }, 0);

    scenarios.push({
      scenario: `${selections[losingIdx].name} loses`,
      losingSelection: losingIdx,
      winningCombinations: winningCombos,
      totalReturn: Math.round(totalReturn * 100) / 100,
      profit: Math.round((totalReturn - bankroll) * 100) / 100,
    });
  }

  // Scenario where all win
  const allWinReturn = betCombinations.reduce((sum, bet) => {
    const payout = calculateCombinationPayout(bet.selections, odds);
    return sum + bet.stake * payout;
  }, 0);

  scenarios.push({
    scenario: "All selections win",
    totalReturn: Math.round(allWinReturn * 100) / 100,
    profit: Math.round((allWinReturn - bankroll) * 100) / 100,
    winningCombinations: betCombinations,
  });

  // Calculate metrics
  const returns = scenarios.map(s => s.totalReturn);
  const worstCaseReturn = Math.min(...returns);
  const bestCaseReturn = Math.max(...returns);
  const averageReturn =
    returns.reduce((a, b) => a + b, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) /
    returns.length;

  const metrics: OptimizerMetrics = {
    totalStake: bankroll,
    worstCaseReturn: Math.round(worstCaseReturn * 100) / 100,
    bestCaseReturn: Math.round(bestCaseReturn * 100) / 100,
    averageReturn: Math.round(averageReturn * 100) / 100,
    returnVariance: Math.round(variance * 100) / 100,
    breakEvenProbability: 0, // Would need individual win probabilities
    roiIfAllWin: Math.round(((allWinReturn - bankroll) / bankroll) * 10000) / 100,
  };

  return {
    combinations: betCombinations,
    scenarios,
    metrics,
  };
}

/**
 * Get system name based on number of selections
 */
export function getSystemName(n: number): string {
  const names: { [key: number]: string } = {
    2: "Parlay",
    3: "Trixie",
    4: "Yankee",
    5: "Canadian",
    6: "Heinz",
  };
  return names[n] || `${n}-Selection System`;
}

/**
 * Get number of combinations for a system
 */
export function getSystemStats(n: number): {
  name: string;
  totalCombinations: number;
  doubles: number;
  trebles: number;
  fourfolds: number;
  fivefolds: number;
  sixfolds: number;
} {
  let doubles = 0,
    trebles = 0,
    fourfolds = 0,
    fivefolds = 0,
    sixfolds = 0;

  if (n >= 2) doubles = (n * (n - 1)) / 2;
  if (n >= 3) trebles = (n * (n - 1) * (n - 2)) / 6;
  if (n >= 4) fourfolds = (n * (n - 1) * (n - 2) * (n - 3)) / 24;
  if (n >= 5) fivefolds = (n * (n - 1) * (n - 2) * (n - 3) * (n - 2)) / 120;
  if (n >= 6) sixfolds = 1;

  const totalCombinations = doubles + trebles + fourfolds + fivefolds + sixfolds;

  return {
    name: getSystemName(n),
    totalCombinations,
    doubles,
    trebles,
    fourfolds,
    fivefolds,
    sixfolds,
  };
}
