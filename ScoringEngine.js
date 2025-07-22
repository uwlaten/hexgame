/**
 * @fileoverview Defines the ScoringEngine class, which processes game events
 * against a set of rules to update the player's score.
 */
import { AllRules, ScoringRule } from './ScoringRules.js';

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
  }

  /**
   * Creates and returns an array of all registered scoring rule instances.
   * @returns {import('./ScoringRules.js').ScoringRule[]}
   * @private
   */
  static _getCoreRules() {
    const rules = [];
    // Initialize the engine with the registered rules.
     for (const RuleClass of Object.values(AllRules)) {
      if (typeof RuleClass === 'function' && RuleClass !== ScoringRule && RuleClass.prototype instanceof ScoringRule) {
        rules.push(new RuleClass());
      }
    }
    return rules;
  }

  /**
   * This is a data structure for reporting how a score was calculated.
   */
  static createScoreReport(breakdown) {
    const total = breakdown.reduce((sum, component) => sum + component.points, 0);
    return { total, breakdown };
  }

  /**
   * Calculates the potential score for placing a building on a given tile.
   * This method does not affect the player's actual score.
   * @param {string} buildingId The ID of the building from BuildingLibrary.
   * @param {import('./HexTile.js').default} tile The tile where the building would be placed.
   * @param {import('./Map.js').default} map The game map.
   * @param {object[]} [appliedTransformations=[]] Optional list of transformations for context-dependent scoring.
   * @returns {object} The calculated score report for the hypothetical placement.
   */
  static calculateScoreFor(buildingId, tile, map, appliedTransformations = []) {
    const rules = ScoringEngine._getCoreRules();
    const breakdown = ScoringEngine._calculateScore(buildingId, tile, map, appliedTransformations, rules);
    return ScoringEngine.createScoreReport(breakdown);
  }

  /**
   * The core static logic for calculating a score breakdown.
   * @private
   */
  static _calculateScore(buildingId, tile, map, appliedTransformations, rules) {
    // Use flatMap to iterate over all rules, evaluate them (which returns an array of score components),
    // and flatten the resulting array of arrays into a single array.
    const allComponents = rules.flatMap(rule => rule.evaluate(tile, buildingId, map, appliedTransformations));

    // Filter out any components that have zero points to keep the final report clean.
    return allComponents.filter(component => component.points !== 0);
  }

  /**
   * Handles the BUILDING_PLACED event, calculates score changes, and updates the player.
   * @param {import('./HexTile.js').default} tile The tile where the building was placed.
   * @param {object[]} appliedTransformations The list of transformations that were applied.
   * @private
   */
  _handleBuildingPlaced(tile, appliedTransformations) {
    const buildingId = tile.contentType.type;
    const rules = ScoringEngine._getCoreRules();
    const breakdown = ScoringEngine._calculateScore(buildingId, tile, tile.map, appliedTransformations, rules);

    const scoreReport = ScoringEngine.createScoreReport(breakdown);

    this.player.score += scoreReport.total;
    this.eventEmitter.emit('SCORE_UPDATED', this.player.score);
  }

    /**
   * Initializes the engine by subscribing to relevant game events.
   */
  init() {
    // This will listen for a new, more specific event that we will create in the next step.
    this.eventEmitter.on('BUILDING_PLACED', this._handleBuildingPlaced.bind(this));
  }

}