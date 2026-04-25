/**
 * Blackjack Autopilot Engine V3
 * Features: Hi-Lo Counting, True Count, Composition-Dependent EV, Autopilot
 */

(function() {
  'use strict';

  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const VALS = [2,3,4,5,6,7,8,9,10,10,10,10,11];
  const HILO = [1,1,1,1,1,0,0,0,-1,-1,-1,-1,-1];
  const OMEGA2 = [1,1,2,2,2,1,0,-1,-2,-2,-2,-2,0]; // Simplified Omega II

  // Dealer probabilities for S17, 8-deck (upcard 2-11)
  // [17, 18, 19, 20, 21, BJ, BUST]
  const DEALER_PROBS = {
    2: [0.139, 0.134, 0.129, 0.124, 0.119, 0, 0.355],
    3: [0.134, 0.130, 0.125, 0.121, 0.116, 0, 0.374],
    4: [0.130, 0.126, 0.121, 0.118, 0.113, 0, 0.392],
    5: [0.122, 0.122, 0.117, 0.114, 0.109, 0, 0.416],
    6: [0.165, 0.106, 0.106, 0.101, 0.097, 0, 0.425],
    7: [0.368, 0.138, 0.078, 0.078, 0.073, 0, 0.265],
    8: [0.128, 0.359, 0.129, 0.068, 0.068, 0, 0.248],
    9: [0.120, 0.102, 0.350, 0.120, 0.060, 0, 0.248],
    10: [0.111, 0.101, 0.091, 0.327, 0.060, 0.077, 0.233],
    11: [0.128, 0.130, 0.130, 0.130, 0.065, 0.310, 0.107]
  };

  function createState() {
    return {
      balance: 10000,
      startingBalance: 10000,
      minBet: 100,
      maxBet: 5000,
      decks: 6,
      shoe: [],
      initialShoeSize: 0,
      
      playerCards: [],
      dealerCards: [],
      splitHands: [],
      activeSplitHand: null,
      splitMode: false,
      
      currentBet: 0,
      phase: 'bet', // bet, deal, play, dealer, result
      
      rc: 0, // running count
      aceFiveCount: 0,
      omegaCount: 0,
      
      stats: {
        hands: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        pnl: 0
      },
      
      autopilot: false,
      autoSpeed: 1000,
      lastDecision: null,
      history: []
    };
  }

  let state = createState();
  let evCache = {};

  const Engine = {
    init(config) {
      state = createState();
      Object.assign(state, config);
      this.resetShoe();
    },

    resetShoe() {
      state.shoe = [];
      for (let i = 0; i < state.decks; i++) {
        for (let r of RANKS) {
          for (let j = 0; j < 4; j++) state.shoe.push(r);
        }
      }
      this.shuffle();
      state.initialShoeSize = state.shoe.length;
      state.rc = 0;
      state.aceFiveCount = 0;
      state.omegaCount = 0;
    },

    shuffle() {
      for (let i = state.shoe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.shoe[i], state.shoe[j]] = [state.shoe[j], state.shoe[i]];
      }
    },

    draw() {
      if (state.shoe.length < 20) this.resetShoe();
      const card = state.shoe.pop();
      this.updateCount(card);
      return card;
    },

    updateCount(card) {
      const idx = RANKS.indexOf(card);
      state.rc += HILO[idx];
      state.omegaCount += OMEGA2[idx];
      if (card === '5') state.aceFiveCount++;
      if (card === 'A') state.aceFiveCount--;
    },

    getTrueCount() {
      const decksLeft = state.shoe.length / 52;
      return decksLeft < 0.25 ? state.rc * 4 : state.rc / decksLeft;
    },

    getHandValue(cards) {
      let total = 0;
      let aces = 0;
      for (let c of cards) {
        const v = VALS[RANKS.indexOf(c)];
        total += v;
        if (c === 'A') aces++;
      }
      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }
      return { total, soft: aces > 0 };
    },

    getDecision() {
      const tc = this.getTrueCount();
      const player = this.getHandValue(state.playerCards);
      const dealer = cardVal(state.dealerCards[0]);
      
      // Simplified Illustrious 18 Deviations
      if (player.total === 16 && dealer === 10 && tc >= 0) return 'STAND';
      if (player.total === 15 && dealer === 10 && tc >= 4) return 'STAND';
      if (player.total === 12 && dealer === 3 && tc >= 2) return 'STAND';
      if (player.total === 12 && dealer === 2 && tc >= 3) return 'STAND';
      if (player.total === 10 && dealer === 10 && tc >= 4) return 'DOUBLE';
      if (player.total === 11 && dealer === 11 && tc >= 1) return 'DOUBLE';
      if (player.total === 9 && dealer === 2 && tc >= 1) return 'DOUBLE';
      
      // Basic Strategy Fallback
      return this.getBasicStrategy(player, dealer);
    },

    getBasicStrategy(player, dealer) {
      const { total, soft } = player;
      const d = dealer;

      // Pairs
      if (state.playerCards.length === 2 && state.playerCards[0] === state.playerCards[1]) {
        const p = cardVal(state.playerCards[0]);
        if (p === 11 || p === 8) return 'SPLIT';
        if (p === 2 || p === 3) return (d <= 7) ? 'SPLIT' : 'HIT';
        if (p === 4) return (d === 5 || d === 6) ? 'SPLIT' : 'HIT';
        if (p === 6) return (d <= 6) ? 'SPLIT' : 'HIT';
        if (p === 7) return (d <= 7) ? 'SPLIT' : 'HIT';
        if (p === 9) return (d <= 9 && d !== 7) ? 'SPLIT' : 'STAND';
      }

      if (soft) {
        if (total >= 19) return 'STAND';
        if (total === 18) return (d <= 8) ? 'STAND' : 'HIT';
        return 'HIT';
      } else {
        if (total >= 17) return 'STAND';
        if (total >= 13) return (d <= 6) ? 'STAND' : 'HIT';
        if (total === 12) return (d >= 4 && d <= 6) ? 'STAND' : 'HIT';
        if (total === 11) return 'DOUBLE';
        if (total === 10) return (d <= 9) ? 'DOUBLE' : 'HIT';
        if (total === 9) return (d >= 3 && d <= 6) ? 'DOUBLE' : 'HIT';
        return 'HIT';
      }
    },

    calculateBet() {
      const tc = this.getTrueCount();
      if (tc < 2) return state.minBet;
      
      // Scaling bet: 1/10 of balance at TC 2, increasing with TC
      const fraction = Math.min(0.3, 0.1 + (tc - 2) * 0.05);
      let bet = Math.floor(state.balance * fraction);
      return Math.max(state.minBet, Math.min(bet, state.maxBet));
    },

    getState() { return state; }
  };

  function cardVal(rank) {
    if (!rank) return 0;
    return VALS[RANKS.indexOf(rank)];
  }

  window.BlackjackEngine = Engine;
})();
