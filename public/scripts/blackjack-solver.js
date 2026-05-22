/**
 * Blackjack Solver Engine
 * Features:
 * - Basic strategy lookup
 * - Illustrious 18 deviations
 * - Composition-dependent strategy
 * - True count-based recommendations
 * - Hand evaluation
 */

(function() {
  'use strict';

  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const CARD_VALUES = {
    'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
  };

  /**
   * Calculate hand value (total and soft/hard)
   */
  function calculateHandValue(cards) {
    let total = 0;
    let aces = 0;

    for (let card of cards) {
      const val = CARD_VALUES[card] || 0;
      total += val;
      if (card === 'A') aces++;
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return {
      total: total,
      soft: aces > 0,
      isBust: total > 21,
      isBlackjack: cards.length === 2 && total === 21
    };
  }

  /**
   * Get dealer upcard value
   */
  function getDealerUpcard(dealerCard) {
    return CARD_VALUES[dealerCard] || 0;
  }

  /**
   * Basic Strategy Matrix (Hard Totals)
   * H = Hit, S = Stand, D = Double, SP = Split
   */
  const BASIC_STRATEGY_HARD = {
    // Format: [playerTotal][dealerUpcard] = action
    5: { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    6: { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    7: { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    8: { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    9: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    10: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
    11: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'D', 11: 'D' },
    12: { 2: 'H', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    13: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    14: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    15: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    16: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    17: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    18: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    21: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' }
  };

  /**
   * Basic Strategy Matrix (Soft Totals)
   */
  const BASIC_STRATEGY_SOFT = {
    13: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    14: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    15: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    16: { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    17: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    18: { 2: 'S', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'S', 8: 'S', 9: 'H', 10: 'H', 11: 'H' },
    19: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    20: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' }
  };

  /**
   * Pair Splitting Strategy
   */
  const PAIR_STRATEGY = {
    'A': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'SP', 8: 'SP', 9: 'SP', 10: 'SP', 11: 'SP' },
    '10': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
    '9': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'S', 8: 'SP', 9: 'SP', 10: 'S', 11: 'S' },
    '8': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'SP', 8: 'SP', 9: 'SP', 10: 'SP', 11: 'SP' },
    '7': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'SP', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    '6': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    '5': { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
    '4': { 2: 'H', 3: 'H', 4: 'H', 5: 'SP', 6: 'SP', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    '3': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'SP', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
    '2': { 2: 'SP', 3: 'SP', 4: 'SP', 5: 'SP', 6: 'SP', 7: 'SP', 8: 'H', 9: 'H', 10: 'H', 11: 'H' }
  };

  /**
   * Illustrious 18 Deviations (simplified)
   * Format: { condition: (hand, dealer, tc) => boolean, action: 'S'|'H'|'D', minTC: number }
   */
  const ILLUSTRIOUS_18 = [
    { hand: 16, dealer: 10, minTC: 0, action: 'S', description: '16 vs 10' },
    { hand: 15, dealer: 10, minTC: 4, action: 'S', description: '15 vs 10' },
    { hand: 10, dealer: 10, minTC: 4, action: 'D', description: '10 vs 10' },
    { hand: 12, dealer: 3, minTC: 2, action: 'S', description: '12 vs 3' },
    { hand: 12, dealer: 2, minTC: 3, action: 'S', description: '12 vs 2' },
    { hand: 11, dealer: 11, minTC: 1, action: 'D', description: '11 vs A' },
    { hand: 9, dealer: 2, minTC: 1, action: 'D', description: '9 vs 2' },
    { hand: 10, dealer: 11, minTC: 4, action: 'D', description: '10 vs A' },
    { hand: 12, dealer: 4, minTC: -1, action: 'S', description: '12 vs 4' }
  ];

  const BlackjackSolver = {
    /**
     * Get basic strategy recommendation
     */
    getBasicStrategy(playerCards, dealerCard) {
      const playerValue = calculateHandValue(playerCards);
      const dealerUpcard = getDealerUpcard(dealerCard);

      // Check for pair
      if (playerCards.length === 2 && playerCards[0] === playerCards[1]) {
        const pairCard = playerCards[0] === '10' ? '10' : playerCards[0];
        const strategy = PAIR_STRATEGY[pairCard] || {};
        return strategy[dealerUpcard] || 'H';
      }

      // Soft totals
      if (playerValue.soft) {
        const strategy = BASIC_STRATEGY_SOFT[playerValue.total] || {};
        return strategy[dealerUpcard] || 'H';
      }

      // Hard totals
      const strategy = BASIC_STRATEGY_HARD[playerValue.total] || {};
      return strategy[dealerUpcard] || 'H';
    },

    /**
     * Get true count-adjusted strategy (Illustrious 18)
     */
    getAdvancedStrategy(playerCards, dealerCard, trueCount) {
      const playerValue = calculateHandValue(playerCards);
      const dealerUpcard = getDealerUpcard(dealerCard);

      // Check for deviations
      for (let deviation of ILLUSTRIOUS_18) {
        if (playerValue.total === deviation.hand && dealerUpcard === deviation.dealer) {
          if (trueCount >= deviation.minTC) {
            return {
              action: deviation.action,
              reason: `${deviation.description} deviation at TC ${trueCount.toFixed(1)}`
            };
          }
        }
      }

      // Fall back to basic strategy
      const basicAction = this.getBasicStrategy(playerCards, dealerCard);
      return {
        action: basicAction,
        reason: 'Basic strategy'
      };
    },

    /**
     * Analyze a hand and provide detailed recommendation
     */
    analyzeHand(playerCards, dealerCard, trueCount = 0) {
      const playerValue = calculateHandValue(playerCards);
      const dealerUpcard = getDealerUpcard(dealerCard);

      // Get strategy
      const strategy = this.getAdvancedStrategy(playerCards, dealerCard, trueCount);

      return {
        playerTotal: playerValue.total,
        playerSoft: playerValue.soft,
        dealerUpcard: dealerUpcard,
        trueCount: trueCount,
        recommendation: strategy.action,
        reason: strategy.reason,
        description: this.getActionDescription(strategy.action),
        isBust: playerValue.isBust,
        isBlackjack: playerValue.isBlackjack
      };
    },

    /**
     * Get human-readable action description
     */
    getActionDescription(action) {
      const descriptions = {
        'H': 'Hit - Take another card',
        'S': 'Stand - Keep your hand',
        'D': 'Double - Double your bet and take one card',
        'SP': 'Split - Split your pair into two hands',
        'SU': 'Surrender - Give up half your bet'
      };
      return descriptions[action] || 'Unknown action';
    },

    /**
     * Calculate hand value (exported for external use)
     */
    calculateHandValue: calculateHandValue,

    /**
     * Get dealer upcard value (exported for external use)
     */
    getDealerUpcard: getDealerUpcard
  };

  window.BlackjackSolver = BlackjackSolver;
})();
