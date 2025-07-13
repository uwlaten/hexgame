/**
 * @fileoverview Defines the ScoringEngine class, which processes game events
 * against a set of rules to update the player's score.
 */

/**
 * The ScoringEngine is responsible for calculating score changes based on game events.
 * It listens for specific events (like a building being placed), evaluates them
 * against a list of registered scoring rules, and updates the player's score.
 */
export default class ScoringEngine {
  /**
   * Creates an instance of the ScoringEngine.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Player.js').default} player The player whose score will be managed.
   */
  constructor(eventEmitter, player) {
    this.eventEmitter = eventEmitter;
    this.player = player;
    /**
     * A list of scoring rule instances to evaluate against.
     * @type {import('./ScoringRules.js').ScoringRule[]}
     * @private
     */
    this.rules = [];
  }

  /**
   * Registers a new scoring rule with the engine.
   * @param {import('./ScoringRules.js').ScoringRule} rule An instance of a class that extends ScoringRule.
   */
  addRule(rule) {
    this.rules.push(rule);
  }

  /**
   * Initializes the engine by subscribing to relevant game events.
   */
  init() {
    // This will listen for a new, more specific event that we will create in the next step.
    this.eventEmitter.on('BUILDING_PLACED', this._handleBuildingPlaced.bind(this));
  }

  /**
   * Handles the BUILDING_PLACED event, calculates score changes, and updates the player.
   * @param {import('./HexTile.js').default} tile The tile where the building was placed.
   * @private
   */
  _handleBuildingPlaced(tile) {
    const scoreChange = this.rules.reduce((totalScore, rule) => {
      return totalScore + rule.evaluate(tile);
    }, 0);

    if (scoreChange > 0) {
      this.player.score += scoreChange;
      this.eventEmitter.emit('SCORE_UPDATED', this.player.score);
    }
  }
}