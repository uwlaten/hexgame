/**
 * @fileoverview Defines the ScoringEngine class, which processes game events
 * against a set of rules to update the player's score.
 * This creates a flexible, data-driven scoring system.
 */


import { AllRules, ScoringRule } from './ScoringRules.js';
import EventEmitter from './EventEmitter.js';

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
    this._registerCoreRules();
    
  }

  _registerCoreRules() {

    // Initialize the engine with the registered rules.
     for (const RuleClass of Object.values(AllRules)) {
      if (RuleClass !== ScoringRule && RuleClass.prototype instanceof ScoringRule) {
        this.addRule(new RuleClass());
      }
    }
  }

  /**
   * This is a data structure for reporting how a score was calculated.
   */
  static createScoreReport(breakdown) {
    const total = breakdown.reduce((sum, component) => sum + component.points, 0);
    return { total, breakdown };
  }
  /**
   * Registers a new scoring rule with the engine.
   * @param {import('./ScoringRules.js').ScoringRule} rule An instance of a class that extends ScoringRule.
   */
  addRule(rule) { this.rules.push(rule); }

  /**
   * Calculates the potential score for placing a building on a given tile.
   * This method does not affect the player's actual score.
   * @param {string} buildingId The ID of the building from BuildingLibrary.
   * @param {import('./HexTile.js').default} tile The tile where the building would be placed.
   * @param {import('./Map.js').default} map The game map.
   * @returns {number} The calculated score for the hypothetical placement.
   */
  static calculateScoreFor(buildingId, tile, map){
    // In this static version, we create a temporary ScoringEngine with the
    // registered rules, but without a player to update. We then use it to
    // evaluate the score. Note that a temporary event emitter is still
    // required, as it's a required parameter for the constructor. However,
    // no events will ever be emitted on it, as this method is purely
    // for calculation.
    const tempEngine = new ScoringEngine(new EventEmitter(), null);
    const breakdown = tempEngine._calculateScore(buildingId, tile, map);
    return ScoringEngine.createScoreReport(breakdown);
  }

  _calculateScore(buildingId, tile, map) {
    // Use flatMap to iterate over all rules, evaluate them (which returns an array of score components),
    // and flatten the resulting array of arrays into a single array.
    const allComponents = this.rules.flatMap(rule => rule.evaluate(tile, buildingId, map));

    // Filter out any components that have zero points to keep the final report clean.
    return allComponents.filter(component => component.points !== 0);
  }




  /**
   * Handles the BUILDING_PLACED event, calculates score changes, and updates the player.
   * @param {import('./HexTile.js').default} tile The tile where the building was placed.
   * @private
   */
  _handleBuildingPlaced(tile) {
    const buildingId = tile.contentType.type;
    const breakdown = this._calculateScore(buildingId, tile, tile.map);

    const scoreReport = ScoringEngine.createScoreReport(breakdown);

    this.player.score += scoreReport.total;
    this.eventEmitter.emit('SCORE_UPDATED', this.player.score);
  }
}