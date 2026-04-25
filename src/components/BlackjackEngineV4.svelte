<script>
  import { onMount, onDestroy } from 'svelte';

  // Constants
  const DECKS = 6;
  const START_BANKROLL = 10000;
  const TABLE_MIN = 100;
  const BJ_PAYOUT = 1.5;
  const SUITS = ["♠", "♥", "♦", "♣"];
  const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const HILO_VALUES = { "A": -1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 0, "8": 0, "9": 0, "10": -1, "J": -1, "Q": -1, "K": -1 };

  const ILLUSTROUS_DEVIATIONS = [
    [16, 10, 0, "stand"], [15, 10, 4, "stand"], [16, 9, 5, "stand"],
    [12, 2, 3, "stand"], [12, 3, 2, "stand"], [13, 2, -1, "stand"],
    [10, 10, 4, "double"], [10, 11, 4, "double"], [11, 11, 1, "double"],
    [9, 2, 1, "double"], [9, 7, 3, "double"],
    [18, 6, 1, "double"], [19, 6, 1, "double"],
  ];

  const BET_FRACTIONS = { neutral: 0.01, tc1: 0.03, tc2: 0.10, tc3: 0.15 };

  // State
  let shoe = [];
  let bankroll = START_BANKROLL;
  let bet = TABLE_MIN;
  let runningCount = 0;
  let trueCountValue = 0;
  let dealtCount = 0;
  let playerHands = []; // [{cards: [], bet: 0, status: 'active'}]
  let activeHandIndex = 0;
  let dealerCards = [];
  let phase = "idle"; // idle, player, dealer, settle
  let mode = "autopilot"; // autopilot, manual
  let autoplay = false;
  let speed = 450;
  let log = "Welcome to Mathify Blackjack Engine. Choose mode and Deal Me In.";
  let stats = { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, profit: 0, peak: START_BANKROLL };
  let timer = null;

  // Derived
  $: cardsRemaining = shoe.length;
  $: decksRemaining = Math.max(0.5, cardsRemaining / 52);
  $: highCardsLeft = shoe.filter(c => ["10", "J", "Q", "K", "A"].includes(c.value)).length;
  $: lowCardsLeft = shoe.filter(c => ["2", "3", "4", "5", "6"].includes(c.value)).length;
  $: highProb = cardsRemaining ? ((highCardsLeft / cardsRemaining) * 100).toFixed(0) : 0;
  $: lowProb = cardsRemaining ? ((lowCardsLeft / cardsRemaining) * 100).toFixed(0) : 0;
  $: edge = (trueCountValue * 0.5 - 0.5).toFixed(1);
  $: suggestedMove = (phase === "player" && playerHands.length > 0) 
    ? decide(playerHands[activeHandIndex].cards, dealerCards[0], trueCountValue) 
    : null;

  // Helper Functions
  function buildShoe() {
    let newShoe = [];
    for (let d = 0; d < DECKS; d++) {
      for (let s of SUITS) {
        for (let v of VALUES) {
          newShoe.push({ suit: s, value: v });
        }
      }
    }
    // Shuffle
    for (let i = newShoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newShoe[i], newShoe[j]] = [newShoe[j], newShoe[i]];
    }
    return newShoe;
  }

  function getPip(card) {
    if (["J", "Q", "K"].includes(card.value)) return 10;
    if (card.value === "A") return 11;
    return parseInt(card.value);
  }

  function getHandValue(cards) {
    let val = 0;
    let aces = 0;
    for (let c of cards) {
      if (c.value === "A") aces++;
      val += getPip(c);
    }
    while (val > 21 && aces > 0) {
      val -= 10;
      aces--;
    }
    return val;
  }

  function isSoft(cards) {
    let val = 0;
    let aces = 0;
    for (let c of cards) {
      if (c.value === "A") aces++;
      val += getPip(c);
    }
    while (val > 21 && aces > 0) {
      val -= 10;
      aces--;
    }
    return aces > 0;
  }

  function getPairValue(cards) {
    if (cards.length !== 2) return null;
    if (cards[0].value === cards[1].value) return cards[0].value;
    return null;
  }

  function decide(handCards, dealerUp, tc) {
    const total = getHandValue(handCards);
    const dealerPip = getPip(dealerUp);
    const soft = isSoft(handCards);
    const pair = getPairValue(handCards);

    if (pair) {
      if (pair === "A" || pair === "8") return "split";
      if (pair === "10" || pair === "J" || pair === "Q" || pair === "K") return "stand";
      if (pair === "9") return [7, 10, 11].includes(dealerPip) ? "stand" : "split";
      if (pair === "7") return dealerPip <= 7 ? "split" : "hit";
      if (pair === "6") return dealerPip <= 6 ? "split" : "hit";
      if (pair === "4") return [5, 6].includes(dealerPip) ? "split" : "hit";
      if (pair === "3" || pair === "2") return dealerPip <= 7 ? "split" : "hit";
    }

    for (const [pt, du, tct, action] of ILLUSTROUS_DEVIATIONS) {
      if (pt === total && du === dealerPip && tc >= tct) return action;
    }

    if (soft && handCards.length === 2) {
      if (total <= 17) return [5, 6].includes(dealerPip) ? "double" : "hit";
      if (total === 18) return [3, 4, 5, 6].includes(dealerPip) ? "double" : ([2, 7, 8].includes(dealerPip) ? "stand" : "hit");
      if (total >= 19) return "stand";
    }

    if (handCards.length === 2) {
      if (total === 11) return "double";
      if (total === 10 && dealerPip <= 9) return "double";
      if (total === 9 && dealerPip >= 3 && dealerPip <= 6) return "double";
    }

    if (total <= 11) return "hit";
    if (total === 12) return dealerPip >= 4 && dealerPip <= 6 ? "stand" : "hit";
    if (total >= 13 && total <= 16) return dealerPip <= 6 ? "stand" : "hit";
    return "stand";
  }

  function calculateBetSize(currentBankroll, tc) {
    if (currentBankroll < TABLE_MIN) return currentBankroll;
    let scaler = BET_FRACTIONS.neutral;
    if (tc >= 3) scaler = BET_FRACTIONS.tc3;
    else if (tc >= 2) scaler = BET_FRACTIONS.tc2;
    else if (tc >= 1) scaler = BET_FRACTIONS.tc1;
    const byEdge = Math.floor(currentBankroll * scaler);
    return Math.max(TABLE_MIN, Math.min(byEdge, Math.floor(currentBankroll * 0.15)));
  }

  // Game Actions
  function drawCard() {
    if (shoe.length < 15) {
      shoe = buildShoe();
      runningCount = 0;
      dealtCount = 0;
      trueCountValue = 0;
      log = "Shoe reshuffled.";
    }
    const card = shoe.pop();
    shoe = [...shoe];
    runningCount += HILO_VALUES[card.value];
    dealtCount++;
    trueCountValue = runningCount / decksRemaining;
    return card;
  }

  function startRound() {
    if (bankroll < TABLE_MIN) {
      log = "Bankroll too low. Resetting...";
      resetGame();
      return;
    }
    
    bet = calculateBetSize(bankroll, trueCountValue);
    bankroll -= bet;
    
    dealerCards = [drawCard(), drawCard()];
    playerHands = [{ cards: [drawCard(), drawCard()], bet: bet, status: 'active' }];
    activeHandIndex = 0;
    phase = "player";
    log = "Cards dealt. Your move.";

    // Check for Blackjacks
    const pVal = getHandValue(playerHands[0].cards);
    const dVal = getHandValue(dealerCards);
    if (pVal === 21 || dVal === 21) {
      phase = "dealer";
      setTimeout(dealerTurn, speed);
    }
  }

  function playerAction(action) {
    if (phase !== "player") return;
    const currentHand = playerHands[activeHandIndex];

    if (action === "hit") {
      currentHand.cards = [...currentHand.cards, drawCard()];
      if (getHandValue(currentHand.cards) >= 21) {
        nextHand();
      }
    } else if (action === "stand") {
      nextHand();
    } else if (action === "double") {
      if (bankroll >= currentHand.bet) {
        bankroll -= currentHand.bet;
        currentHand.bet *= 2;
        currentHand.cards = [...currentHand.cards, drawCard()];
        nextHand();
      } else {
        log = "Insufficient funds to double.";
      }
    } else if (action === "split") {
      const pair = getPairValue(currentHand.cards);
      if (pair && bankroll >= currentHand.bet) {
        bankroll -= currentHand.bet;
        const card1 = currentHand.cards[0];
        const card2 = currentHand.cards[1];
        
        playerHands.splice(activeHandIndex, 1, 
          { cards: [card1, drawCard()], bet: currentHand.bet, status: 'active' },
          { cards: [card2, drawCard()], bet: currentHand.bet, status: 'active' }
        );
        playerHands = [...playerHands];
        
        // If splitting Aces, usually only get one card
        if (pair === "A") {
          phase = "dealer";
          setTimeout(dealerTurn, speed);
        }
      } else {
        log = "Cannot split.";
      }
    }
    playerHands = [...playerHands];
  }

  function nextHand() {
    if (activeHandIndex < playerHands.length - 1) {
      activeHandIndex++;
    } else {
      phase = "dealer";
      setTimeout(dealerTurn, speed);
    }
  }

  function dealerTurn() {
    if (phase !== "dealer") return;
    
    // Check if any player hand is still in play (not bust)
    const allBust = playerHands.every(h => getHandValue(h.cards) > 21);
    
    if (!allBust) {
      while (getHandValue(dealerCards) < 17) {
        dealerCards = [...dealerCards, drawCard()];
      }
    }
    
    phase = "settle";
    settleRound();
  }

  function settleRound() {
    const dVal = getHandValue(dealerCards);
    const dBJ = dealerCards.length === 2 && dVal === 21;
    
    let roundProfit = 0;
    let roundWins = 0, roundLosses = 0, roundPushes = 0, roundBJs = 0;

    playerHands.forEach(h => {
      const pVal = getHandValue(h.cards);
      const pBJ = h.cards.length === 2 && pVal === 21;
      
      if (pVal > 21) {
        roundLosses++;
      } else if (dBJ) {
        if (pBJ) {
          bankroll += h.bet;
          roundPushes++;
        } else {
          roundLosses++;
        }
      } else if (pBJ) {
        const payout = h.bet + (h.bet * BJ_PAYOUT);
        bankroll += payout;
        roundProfit += (h.bet * BJ_PAYOUT);
        roundWins++;
        roundBJs++;
      } else if (dVal > 21 || pVal > dVal) {
        bankroll += h.bet * 2;
        roundProfit += h.bet;
        roundWins++;
      } else if (pVal === dVal) {
        bankroll += h.bet;
        roundPushes++;
      } else {
        roundLosses++;
      }
    });

    stats.hands++;
    stats.wins += roundWins;
    stats.losses += roundLosses;
    stats.pushes += roundPushes;
    stats.blackjacks += roundBJs;
    stats.profit = bankroll - START_BANKROLL;
    stats.peak = Math.max(stats.peak, bankroll);
    
    log = roundWins > roundLosses ? "Round Won!" : (roundWins < roundLosses ? "Round Lost." : "Push.");
    
    if (autoplay && mode === "autopilot") {
      timer = setTimeout(startRound, speed * 2);
    } else {
      phase = "idle";
    }
  }

  function resetGame() {
    shoe = buildShoe();
    bankroll = START_BANKROLL;
    bet = TABLE_MIN;
    runningCount = 0;
    trueCountValue = 0;
    dealtCount = 0;
    playerHands = [];
    dealerCards = [];
    phase = "idle";
    stats = { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, profit: 0, peak: START_BANKROLL };
    log = "Engine reset. Ready.";
  }

  function toggleAutoplay() {
    autoplay = !autoplay;
    if (autoplay && phase === "idle") {
      startRound();
    }
  }

  // Lifecycle
  onMount(() => {
    shoe = buildShoe();
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });

  // Autopilot Decision Loop
  $: if (autoplay && mode === "autopilot" && phase === "player") {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const move = decide(playerHands[activeHandIndex].cards, dealerCards[0], trueCountValue);
      playerAction(move);
    }, speed);
  }

</script>

<div class="bj-container">
  <div class="bj-header">
    <div class="bj-header-left">
      <h1>BLACKJACK ENGINE</h1>
      <p>You feed cards. Math decides everything.</p>
    </div>
    <div class="bj-mode-toggle">
      <button 
        class="mode-btn {mode === 'autopilot' ? 'active' : ''}" 
        on:click={() => { mode = 'autopilot'; autoplay = false; }}
      >
        Autopilot
      </button>
      <button 
        class="mode-btn {mode === 'manual' ? 'active' : ''}" 
        on:click={() => { mode = 'manual'; autoplay = false; }}
      >
        Manual Trainer
      </button>
    </div>
  </div>

  <div class="bj-stats-bar">
    <div class="stat-item">
      <span class="stat-label">True Count</span>
      <span class="stat-value">{trueCountValue.toFixed(1)}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Hi-Lo</span>
      <span class="stat-value" style="color: {runningCount > 0 ? 'var(--teal)' : (runningCount < 0 ? 'var(--red)' : 'inherit')}">
        {runningCount > 0 ? '+' : ''}{runningCount}
      </span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Edge</span>
      <span class="stat-value" style="color: {edge > 0 ? 'var(--teal)' : 'var(--red)'}">{edge}%</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Decks Left</span>
      <span class="stat-value">{decksRemaining.toFixed(1)}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Hands</span>
      <span class="stat-value">{stats.hands}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Win Rate</span>
      <span class="stat-value">{stats.hands ? ((stats.wins / stats.hands) * 100).toFixed(1) : "—"}%</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Bankroll</span>
      <span class="stat-value" style="color: var(--amber)">${bankroll.toLocaleString()}</span>
    </div>
  </div>

  <div class="bj-main-area">
    <div class="bj-table">
      <!-- Dealer -->
      <div class="hand-section dealer">
        <div class="cards-container">
          {#each dealerCards as card, i}
            <div class="card {card.suit === '♥' || card.suit === '♦' ? 'red' : ''} {phase === 'player' && i === 1 ? 'hidden' : ''}">
              {#if phase === 'player' && i === 1}
                <div class="card-back"></div>
              {:else}
                <span class="card-value">{card.value}</span>
                <span class="card-suit">{card.suit}</span>
              {/if}
            </div>
          {/each}
        </div>
        <div class="hand-info">
          Dealer: {dealerCards.length > 0 ? (phase === 'player' ? getPip(dealerCards[0]) : getHandValue(dealerCards)) : '—'}
        </div>
      </div>

      <!-- Center Info -->
      <div class="center-panel">
        <div class="bet-display">
          <span class="label">CURRENT BET</span>
          <span class="value">${bet}</span>
        </div>
        <div class="log-display">{log}</div>
        {#if suggestedMove && mode === 'manual'}
          <div class="suggestion">Suggested: {suggestedMove.toUpperCase()}</div>
        {/if}
      </div>

      <!-- Player -->
      <div class="player-hands-container">
        {#each playerHands as hand, idx}
          <div class="hand-section player {idx === activeHandIndex && phase === 'player' ? 'active' : ''}">
            <div class="cards-container">
              {#each hand.cards as card}
                <div class="card {card.suit === '♥' || card.suit === '♦' ? 'red' : ''}">
                  <span class="card-value">{card.value}</span>
                  <span class="card-suit">{card.suit}</span>
                </div>
              {/each}
            </div>
            <div class="hand-info">
              {getHandValue(hand.cards)} — Bet ${hand.bet}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Sidebar Probabilities -->
    <div class="bj-sidebar">
      <div class="sidebar-panel">
        <h3>Next Card Probabilities</h3>
        <div class="prob-item">
          <div class="prob-label">
            <span>High Cards (10/A)</span>
            <span>{highProb}%</span>
          </div>
          <div class="prob-bar"><div class="fill" style="width: {highProb}%"></div></div>
        </div>
        <div class="prob-item">
          <div class="prob-label">
            <span>Low Cards (2-6)</span>
            <span>{lowProb}%</span>
          </div>
          <div class="prob-bar"><div class="fill" style="width: {lowProb}%"></div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="bj-controls">
    <button 
      class="control-btn primary" 
      on:click={phase === 'idle' || phase === 'settle' ? startRound : toggleAutoplay}
    >
      {#if phase === 'idle' || phase === 'settle'}
        Deal Me In
      {:else}
        {autoplay ? 'Pause' : 'Resume'}
      {/if}
    </button>
    
    <button class="control-btn" on:click={resetGame}>Reset</button>

    {#if mode === 'manual' && phase === 'player'}
      <div class="manual-actions">
        <button class="action-btn" on:click={() => playerAction('hit')}>Hit</button>
        <button class="action-btn" on:click={() => playerAction('stand')}>Stand</button>
        <button class="action-btn" on:click={() => playerAction('double')}>Double</button>
        <button class="action-btn" on:click={() => playerAction('split')}>Split</button>
      </div>
    {/if}

    <div class="speed-control">
      <label for="speed">Speed</label>
      <input type="range" id="speed" min="100" max="2000" step="100" bind:value={speed} />
    </div>
  </div>
</div>

<style>
  .bj-container {
    background: #0a0a0f;
    color: #e2e2e9;
    font-family: 'Space Mono', monospace;
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid #1e1e2e;
    max-width: 1100px;
    margin: 0 auto;
  }

  .bj-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .bj-header h1 {
    font-size: 1.5rem;
    color: #4ec9b0;
    margin: 0;
    letter-spacing: 2px;
  }

  .bj-header p {
    color: #6b7280;
    font-size: 0.8rem;
    margin: 0.2rem 0 0 0;
  }

  .bj-mode-toggle {
    display: flex;
    gap: 0.5rem;
    background: #151520;
    padding: 0.3rem;
    border-radius: 12px;
  }

  .mode-btn {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: #4ec9b0;
    color: #0a0a0f;
  }

  .bj-stats-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    background: #151520;
    padding: 1.5rem;
    border-radius: 15px;
    border: 1px solid #1e1e2e;
    margin-bottom: 2rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 0.65rem;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 700;
  }

  .bj-main-area {
    display: grid;
    grid-template-columns: 1fr 250px;
    gap: 2rem;
  }

  .bj-table {
    background: radial-gradient(circle at center, #1a2e25 0%, #0a0a0f 100%);
    border: 4px solid #1e1e2e;
    border-radius: 50px;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 500px;
  }

  .hand-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .cards-container {
    display: flex;
    justify-content: center;
    min-height: 100px;
  }

  .card {
    width: 60px;
    height: 85px;
    background: white;
    border-radius: 6px;
    color: black;
    display: flex;
    flex-direction: column;
    padding: 5px;
    font-weight: 700;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    margin-right: -35px;
    position: relative;
    border: 1px solid #ddd;
  }

  .card:last-child {
    margin-right: 0;
  }

  .card.red { color: #dc2626; }

  .card.hidden {
    background: #1e1e2e;
    border: 1px solid #4ec9b0;
  }

  .hand-info {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .center-panel {
    text-align: center;
    padding: 1rem;
  }

  .bet-display {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }

  .bet-display .label { font-size: 0.6rem; color: #6b7280; }
  .bet-display .value { font-size: 1.5rem; color: #d4a94a; font-weight: 700; }

  .log-display {
    font-size: 0.85rem;
    color: #e2e2e9;
    min-height: 1.2rem;
  }

  .suggestion {
    margin-top: 0.5rem;
    color: #4ec9b0;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .bj-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .sidebar-panel {
    background: #151520;
    border: 1px solid #1e1e2e;
    border-radius: 15px;
    padding: 1.2rem;
  }

  .sidebar-panel h3 {
    font-size: 0.8rem;
    color: #d4a94a;
    text-transform: uppercase;
    margin: 0 0 1rem 0;
    border-bottom: 1px solid #1e1e2e;
    padding-bottom: 0.5rem;
  }

  .prob-item {
    margin-bottom: 1rem;
  }

  .prob-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    margin-bottom: 0.4rem;
  }

  .prob-bar {
    height: 6px;
    background: #0a0a0f;
    border-radius: 3px;
    overflow: hidden;
  }

  .prob-bar .fill {
    height: 100%;
    background: #4ec9b0;
    transition: width 0.3s ease;
  }

  .bj-controls {
    margin-top: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .control-btn {
    padding: 0.8rem 1.5rem;
    border: 1px solid #1e1e2e;
    background: transparent;
    color: #e2e2e9;
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    transition: all 0.2s;
  }

  .control-btn.primary {
    background: #4ec9b0;
    color: #0a0a0f;
    border: none;
    min-width: 150px;
  }

  .control-btn:hover {
    border-color: #4ec9b0;
  }

  .manual-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    background: #151520;
    border: 1px solid #1e1e2e;
    color: #e2e2e9;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
  }

  .action-btn:hover {
    border-color: #4ec9b0;
    color: #4ec9b0;
  }

  .speed-control {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-left: auto;
  }

  .speed-control label { font-size: 0.7rem; color: #6b7280; text-transform: uppercase; }

  input[type="range"] {
    accent-color: #4ec9b0;
  }

  @media (max-width: 900px) {
    .bj-main-area {
      grid-template-columns: 1fr;
    }
  }
</style>
