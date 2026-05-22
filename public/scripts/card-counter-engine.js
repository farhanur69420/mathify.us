/**
 * Advanced Card Counter Engine
 * Features:
 * - Hi-Lo counting system
 * - True count calculation
 * - Shoe composition tracking
 * - Mis-count detection
 * - Running count display
 * - Decks remaining calculation
 * - Card history logging
 */

(function() {
  'use strict';

  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const HILO_VALUES = {
    'A': -1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
    '7': 0, '8': 0, '9': 0, '10': -1, 'J': -1, 'Q': -1, 'K': -1
  };

  function createState(numDecks = 6) {
    const totalCards = numDecks * 52;
    const shoeRemaining = {};
    
    // Initialize shoe composition: 4 of each rank per deck
    for (let i = 1; i <= numDecks; i++) {
      shoeRemaining['A'] = numDecks * 4;
      shoeRemaining['2'] = numDecks * 4;
      shoeRemaining['3'] = numDecks * 4;
      shoeRemaining['4'] = numDecks * 4;
      shoeRemaining['5'] = numDecks * 4;
      shoeRemaining['6'] = numDecks * 4;
      shoeRemaining['7'] = numDecks * 4;
      shoeRemaining['8'] = numDecks * 4;
      shoeRemaining['9'] = numDecks * 4;
      shoeRemaining['10'] = numDecks * 16; // 10, J, Q, K
    }

    return {
      numDecks: numDecks,
      totalCards: totalCards,
      shoeRemaining: shoeRemaining,
      cardsDealt: 0,
      runningCount: 0,
      history: [],
      gamePhase: 'setup' // setup, counting, paused
    };
  }

  let state = createState(6);

  const CardCounterEngine = {
    /**
     * Initialize the counter with a specific number of decks
     */
    init(numDecks = 6) {
      if (numDecks < 1 || numDecks > 8) {
        console.warn('Invalid deck count, defaulting to 6');
        numDecks = 6;
      }
      state = createState(numDecks);
      state.gamePhase = 'counting';
    },

    /**
     * Record a card being dealt
     */
    recordCard(rank) {
      const normalizedRank = String(rank).toUpperCase();
      
      // Validate rank
      if (!HILO_VALUES.hasOwnProperty(normalizedRank)) {
        throw new Error(`Invalid rank: ${rank}`);
      }

      // Check for mis-count (more cards of this rank than available)
      if (state.shoeRemaining[normalizedRank] <= 0) {
        return {
          success: false,
          error: `Mis-count detected: No ${normalizedRank}s remaining in shoe`,
          miscount: true
        };
      }

      // Update shoe composition
      state.shoeRemaining[normalizedRank]--;
      state.cardsDealt++;

      // Update running count
      const hiloValue = HILO_VALUES[normalizedRank];
      state.runningCount += hiloValue;

      // Add to history
      state.history.push({
        rank: normalizedRank,
        hiloValue: hiloValue,
        runningCount: state.runningCount,
        cardsDealt: state.cardsDealt,
        timestamp: Date.now()
      });

      return {
        success: true,
        runningCount: state.runningCount,
        trueCount: this.getTrueCount(),
        cardsDealt: state.cardsDealt,
        cardsRemaining: this.getCardsRemaining()
      };
    },

    /**
     * Undo the last card
     */
    undoLastCard() {
      if (state.history.length === 0) {
        return { success: false, error: 'No cards to undo' };
      }

      const lastEntry = state.history.pop();
      state.shoeRemaining[lastEntry.rank]++;
      state.cardsDealt--;
      state.runningCount -= lastEntry.hiloValue;

      return {
        success: true,
        runningCount: state.runningCount,
        trueCount: this.getTrueCount(),
        cardsDealt: state.cardsDealt,
        cardsRemaining: this.getCardsRemaining()
      };
    },

    /**
     * Clear all counts and reset to initial state
     */
    reset() {
      const numDecks = state.numDecks;
      state = createState(numDecks);
      state.gamePhase = 'counting';
      return { success: true };
    },

    /**
     * Get running count
     */
    getRunningCount() {
      return state.runningCount;
    },

    /**
     * Calculate true count (running count / decks remaining)
     */
    getTrueCount() {
      const cardsRemaining = this.getCardsRemaining();
      const decksRemaining = cardsRemaining / 52;
      
      if (decksRemaining < 0.5) {
        return state.runningCount * 4; // Extreme penetration adjustment
      }
      
      return decksRemaining > 0 ? state.runningCount / decksRemaining : 0;
    },

    /**
     * Get cards remaining in shoe
     */
    getCardsRemaining() {
      return state.totalCards - state.cardsDealt;
    },

    /**
     * Get decks remaining
     */
    getDecksRemaining() {
      return this.getCardsRemaining() / 52;
    },

    /**
     * Get shoe composition (remaining cards by rank)
     */
    getShoeComposition() {
      return { ...state.shoeRemaining };
    },

    /**
     * Get penetration percentage (cards dealt / total cards)
     */
    getPenetration() {
      return (state.cardsDealt / state.totalCards) * 100;
    },

    /**
     * Get betting recommendation based on true count
     */
    getBettingRecommendation() {
      const tc = this.getTrueCount();
      
      if (tc < 0) return { level: 'AVOID', multiplier: 0.5, description: 'Negative count, minimum bet' };
      if (tc < 1) return { level: 'NEUTRAL', multiplier: 1, description: 'Neutral count, base bet' };
      if (tc < 2) return { level: 'SLIGHT', multiplier: 1.5, description: 'Slight advantage, 1.5x bet' };
      if (tc < 3) return { level: 'MODERATE', multiplier: 2, description: 'Moderate advantage, 2x bet' };
      if (tc < 4) return { level: 'GOOD', multiplier: 3, description: 'Good advantage, 3x bet' };
      return { level: 'EXCELLENT', multiplier: 4, description: 'Excellent advantage, 4x bet' };
    },

    /**
     * Get full state
     */
    getState() {
      return {
        numDecks: state.numDecks,
        runningCount: state.runningCount,
        trueCount: this.getTrueCount(),
        cardsDealt: state.cardsDealt,
        cardsRemaining: this.getCardsRemaining(),
        decksRemaining: this.getDecksRemaining(),
        penetration: this.getPenetration(),
        shoeComposition: this.getShoeComposition(),
        history: state.history,
        bettingRecommendation: this.getBettingRecommendation(),
        gamePhase: state.gamePhase
      };
    },

    /**
     * Get card history (last N entries)
     */
    getHistory(limit = 20) {
      return state.history.slice(-limit).reverse();
    },

    /**
     * Check if shoe needs reset (penetration > 75%)
     */
    shouldResetShoe() {
      return this.getPenetration() > 75;
    }
  };

  window.CardCounterEngine = CardCounterEngine;
})();
