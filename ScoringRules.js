/**
 * @fileoverview Defines a library of rules for calculating player scores.
 * This creates a flexible, data-driven scoring system.
 */

import { BuildingLibrary } from './BuildingLibrary.js';
import { BiomeLibrary } from './BiomeLibrary.js';
import { Building } from './Building.js';

/**
 * Base class for all scoring rules. It establishes a contract that all
 * specific rule implementations must follow.
 */
export class ScoringRule {
  constructor() {
    if (this.constructor === ScoringRule) {
      throw new Error("Abstract class 'ScoringRule' cannot be instantiated directly.");
    }
  }

  /**
   * Evaluates the score for a given game action.
   * @param {import('./HexTile.js').default} tile The tile related to the event.
   * @returns {number} The score awarded by this rule.
   */
  evaluate(tile) {
    throw new Error("Method 'evaluate()' must be implemented.");
  }
}

/**
 * A specific scoring rule that awards points for placing a Residence on a Savannah tile.
 */
export class ResidenceOnSavannahRule extends ScoringRule {
  /**
   * Awards 1 point if a Residence is on a Savannah tile.
   * @override
   * @param {import('./HexTile.js').default} tile The tile where a building was placed.
   * @returns {number} 1 if the condition is met, otherwise 0.
   */
  evaluate(tile) {
    const isResidence = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.RESIDENCE.id;
    const isSavannah = tile.biome.id === BiomeLibrary.SAVANNAH.id;

    if (isResidence && isSavannah) {
      return 1;
    }
    return 0;
  }
}