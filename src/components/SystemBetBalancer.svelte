<script lang="ts">
  import {
    optimizeSystemBet,
    getSystemName,
    getSystemStats,
    type Selection,
    type OptimizerResult,
  } from '../utils/systemBetOptimizer';

  let selections: Selection[] = [
    { name: 'England', odds: 1.2 },
    { name: 'Portugal DNB', odds: 1.28 },
    { name: 'Senegal', odds: 1.62 },
  ];

  let bankroll: number = 1000;
  let result: OptimizerResult | null = null;
  let error: string = '';

  function addSelection() {
    selections = [
      ...selections,
      { name: `Selection ${selections.length + 1}`, odds: 1.5 },
    ];
  }

  function removeSelection(index: number) {
    selections = selections.filter((_, i) => i !== index);
    result = null;
  }

  function updateSelection(index: number, field: 'name' | 'odds', value: any) {
    selections[index][field] = field === 'odds' ? parseFloat(value) : value;
    selections = selections;
    result = null;
  }

  function optimize() {
    error = '';

    if (selections.length < 2) {
      error = 'Please add at least 2 selections';
      return;
    }

    if (selections.length > 6) {
      error = 'Maximum 6 selections allowed';
      return;
    }

    if (bankroll <= 0) {
      error = 'Bankroll must be greater than 0';
      return;
    }

    if (selections.some(s => s.odds < 1)) {
      error = 'All odds must be at least 1.0';
      return;
    }

    try {
      result = optimizeSystemBet(selections, bankroll);
    } catch (e) {
      error = `Optimization failed: ${e}`;
    }
  }

  function formatCurrency(value: number): string {
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getSelectionNames(indices: number[]): string {
    return indices.map(i => selections[i].name).join(' × ');
  }

  $: systemStats = selections.length >= 2 ? getSystemStats(selections.length) : null;
</script>

<div class="sbb-container">
  <div class="sbb-header">
    <h1>System Bet Balancer</h1>
    <p class="sbb-subtitle">
      Optimize your system bet stakes to equalize payouts across all losing scenarios
    </p>
  </div>

  <div class="sbb-layout">
    <!-- Left Panel: Input -->
    <div class="sbb-panel sbb-input-panel">
      <div class="sbb-section">
        <h2>Selections</h2>
        <div class="sbb-selections">
          {#each selections as selection, index (index)}
            <div class="sbb-selection-row">
              <input
                type="text"
                class="sbb-input sbb-input-name"
                placeholder="Selection name"
                value={selection.name}
                on:input={e => updateSelection(index, 'name', e.target.value)}
              />
              <input
                type="number"
                class="sbb-input sbb-input-odds"
                placeholder="Odds"
                min="1"
                step="0.01"
                value={selection.odds}
                on:input={e => updateSelection(index, 'odds', e.target.value)}
              />
              <button
                class="sbb-btn sbb-btn-remove"
                on:click={() => removeSelection(index)}
              >
                ✕
              </button>
            </div>
          {/each}
        </div>

        {#if selections.length < 6}
          <button class="sbb-btn sbb-btn-secondary" on:click={addSelection}>
            + Add Selection
          </button>
        {/if}
      </div>

      <div class="sbb-section">
        <h2>Bankroll</h2>
        <div class="sbb-input-group">
          <input
            type="number"
            class="sbb-input"
            placeholder="Total stake"
            min="1"
            step="1"
            value={bankroll}
            on:input={e => (bankroll = parseFloat(e.target.value))}
          />
        </div>
      </div>

      {#if systemStats}
        <div class="sbb-section sbb-system-info">
          <h3>{systemStats.name}</h3>
          <div class="sbb-stats-grid">
            <div class="sbb-stat">
              <span class="sbb-stat-label">Total Bets</span>
              <span class="sbb-stat-value">{systemStats.totalCombinations}</span>
            </div>
            {#if systemStats.doubles > 0}
              <div class="sbb-stat">
                <span class="sbb-stat-label">Doubles</span>
                <span class="sbb-stat-value">{systemStats.doubles}</span>
              </div>
            {/if}
            {#if systemStats.trebles > 0}
              <div class="sbb-stat">
                <span class="sbb-stat-label">Trebles</span>
                <span class="sbb-stat-value">{systemStats.trebles}</span>
              </div>
            {/if}
            {#if systemStats.fourfolds > 0}
              <div class="sbb-stat">
                <span class="sbb-stat-label">4-Folds</span>
                <span class="sbb-stat-value">{systemStats.fourfolds}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <button
        class="sbb-btn sbb-btn-primary"
        on:click={optimize}
        disabled={selections.length < 2}
      >
        Optimize Stakes
      </button>

      {#if error}
        <div class="sbb-error">{error}</div>
      {/if}
    </div>

    <!-- Right Panel: Results -->
    <div class="sbb-panel sbb-results-panel">
      {#if result}
        <!-- Metrics -->
        <div class="sbb-section">
          <h2>Key Metrics</h2>
          <div class="sbb-metrics-grid">
            <div class="sbb-metric-card">
              <div class="sbb-metric-label">Worst Case Return</div>
              <div class="sbb-metric-value">{formatCurrency(result.metrics.worstCaseReturn)}</div>
              <div class="sbb-metric-profit">
                {result.metrics.worstCaseReturn >= bankroll
                  ? `+${formatCurrency(result.metrics.worstCaseReturn - bankroll)}`
                  : `-${formatCurrency(bankroll - result.metrics.worstCaseReturn)}`}
              </div>
            </div>
            <div class="sbb-metric-card">
              <div class="sbb-metric-label">Best Case Return</div>
              <div class="sbb-metric-value">{formatCurrency(result.metrics.bestCaseReturn)}</div>
              <div class="sbb-metric-profit">
                +{formatCurrency(result.metrics.bestCaseReturn - bankroll)}
              </div>
            </div>
            <div class="sbb-metric-card">
              <div class="sbb-metric-label">Average Return</div>
              <div class="sbb-metric-value">{formatCurrency(result.metrics.averageReturn)}</div>
              <div class="sbb-metric-profit">
                {result.metrics.averageReturn >= bankroll
                  ? `+${formatCurrency(result.metrics.averageReturn - bankroll)}`
                  : `-${formatCurrency(bankroll - result.metrics.averageReturn)}`}
              </div>
            </div>
            <div class="sbb-metric-card">
              <div class="sbb-metric-label">ROI (All Win)</div>
              <div class="sbb-metric-value">{result.metrics.roiIfAllWin}%</div>
              <div class="sbb-metric-profit">
                {result.metrics.roiIfAllWin > 0 ? '✓' : '✗'}
              </div>
            </div>
          </div>
        </div>

        <!-- Scenario Analysis -->
        <div class="sbb-section">
          <h2>Scenario Analysis</h2>
          <div class="sbb-scenarios">
            {#each result.scenarios as scenario (scenario.scenario)}
              <div class="sbb-scenario-card">
                <div class="sbb-scenario-header">
                  <span class="sbb-scenario-title">{scenario.scenario}</span>
                  <span class="sbb-scenario-return">
                    {formatCurrency(scenario.totalReturn)}
                  </span>
                </div>
                <div class="sbb-scenario-profit">
                  {scenario.profit >= 0
                    ? `+${formatCurrency(scenario.profit)}`
                    : `-${formatCurrency(-scenario.profit)}`}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Stake Distribution -->
        <div class="sbb-section">
          <h2>Stake Distribution</h2>
          <div class="sbb-stakes-table">
            <div class="sbb-table-header">
              <div class="sbb-table-col sbb-col-combo">Combination</div>
              <div class="sbb-table-col sbb-col-stake">Stake</div>
            </div>
            {#each result.combinations as bet (bet.selections.join('-'))}
              <div class="sbb-table-row">
                <div class="sbb-table-col sbb-col-combo">
                  {getSelectionNames(bet.selections)}
                </div>
                <div class="sbb-table-col sbb-col-stake">
                  {formatCurrency(bet.stake)}
                </div>
              </div>
            {/each}
            <div class="sbb-table-row sbb-table-total">
              <div class="sbb-table-col sbb-col-combo">Total</div>
              <div class="sbb-table-col sbb-col-stake">
                {formatCurrency(result.metrics.totalStake)}
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="sbb-empty-state">
          <p>Enter your selections and click "Optimize Stakes" to see results</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .sbb-container {
    padding: 2rem 1rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
    color: #e0e4ef;
    font-family: 'Inter', sans-serif;
  }

  .sbb-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .sbb-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    background: linear-gradient(135deg, #4ec9b0 0%, #d4a94a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .sbb-subtitle {
    font-size: 1rem;
    color: rgba(224, 228, 239, 0.7);
    margin: 0;
  }

  .sbb-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .sbb-layout {
      grid-template-columns: 1fr;
    }
  }

  .sbb-panel {
    background: #111118;
    border: 1px solid #222233;
    border-radius: 12px;
    padding: 2rem;
    backdrop-filter: blur(10px);
  }

  .sbb-section {
    margin-bottom: 2rem;
  }

  .sbb-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1rem;
    color: #4ec9b0;
  }

  .sbb-section h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: #d4a94a;
  }

  .sbb-selections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .sbb-selection-row {
    display: grid;
    grid-template-columns: 1fr 100px 40px;
    gap: 0.5rem;
    align-items: center;
  }

  .sbb-input {
    background: #1a1a24;
    border: 1px solid #222233;
    border-radius: 6px;
    padding: 0.75rem;
    color: #e0e4ef;
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  .sbb-input:focus {
    outline: none;
    border-color: #4ec9b0;
    box-shadow: 0 0 0 3px rgba(78, 201, 176, 0.1);
  }

  .sbb-input-name {
    grid-column: 1;
  }

  .sbb-input-odds {
    grid-column: 2;
  }

  .sbb-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sbb-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sbb-btn-primary {
    background: linear-gradient(135deg, #4ec9b0 0%, #3ba89a 100%);
    color: #0a0a0f;
    width: 100%;
    margin-top: 1rem;
  }

  .sbb-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(78, 201, 176, 0.3);
  }

  .sbb-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sbb-btn-secondary {
    background: #1a1a24;
    border: 1px solid #222233;
    color: #4ec9b0;
    width: 100%;
  }

  .sbb-btn-secondary:hover {
    background: #222233;
    border-color: #4ec9b0;
  }

  .sbb-btn-remove {
    background: #3a1a1a;
    color: #ff6b6b;
    padding: 0.5rem;
    width: 40px;
    height: 40px;
  }

  .sbb-btn-remove:hover {
    background: #4a2a2a;
  }

  .sbb-system-info {
    background: rgba(78, 201, 176, 0.05);
    border: 1px solid rgba(78, 201, 176, 0.2);
    border-radius: 8px;
    padding: 1rem;
  }

  .sbb-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .sbb-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sbb-stat-label {
    font-size: 0.85rem;
    color: rgba(224, 228, 239, 0.6);
  }

  .sbb-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #4ec9b0;
  }

  .sbb-error {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 6px;
    padding: 1rem;
    color: #ff6b6b;
    font-size: 0.9rem;
    margin-top: 1rem;
  }

  .sbb-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .sbb-metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .sbb-metric-card {
    background: #1a1a24;
    border: 1px solid #222233;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .sbb-metric-label {
    font-size: 0.85rem;
    color: rgba(224, 228, 239, 0.6);
    margin-bottom: 0.5rem;
  }

  .sbb-metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4ec9b0;
    margin-bottom: 0.25rem;
  }

  .sbb-metric-profit {
    font-size: 0.9rem;
    color: #d4a94a;
  }

  .sbb-scenarios {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sbb-scenario-card {
    background: #1a1a24;
    border: 1px solid #222233;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sbb-scenario-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sbb-scenario-title {
    font-size: 0.95rem;
    font-weight: 500;
  }

  .sbb-scenario-return {
    font-size: 1.1rem;
    font-weight: 700;
    color: #4ec9b0;
  }

  .sbb-scenario-profit {
    font-size: 0.9rem;
    color: #d4a94a;
  }

  .sbb-stakes-table {
    background: #1a1a24;
    border: 1px solid #222233;
    border-radius: 8px;
    overflow: hidden;
  }

  .sbb-table-header {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 1rem;
    padding: 1rem;
    background: #222233;
    font-weight: 600;
    font-size: 0.9rem;
    color: #4ec9b0;
    border-bottom: 1px solid #333344;
  }

  .sbb-table-row {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #222233;
    align-items: center;
  }

  .sbb-table-row:last-child {
    border-bottom: none;
  }

  .sbb-table-total {
    background: rgba(78, 201, 176, 0.05);
    font-weight: 600;
    border-top: 2px solid #222233;
  }

  .sbb-table-col {
    font-size: 0.9rem;
  }

  .sbb-col-combo {
    text-align: left;
  }

  .sbb-col-stake {
    text-align: right;
    color: #d4a94a;
  }

  .sbb-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: rgba(224, 228, 239, 0.5);
    text-align: center;
  }
</style>
