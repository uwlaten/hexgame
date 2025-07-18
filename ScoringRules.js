/**
 * @fileoverview Defines a library of rules for calculating player scores.
 * This creates a flexible, data-driven scoring system.
 * This creates a flexible, data-driven scoring system.
 */

import { BuildingLibrary, BuildingDefinitionMap } from './BuildingLibrary.js';
import HexGridUtils from './HexGridUtils.js';
import { BiomeLibrary } from './BiomeLibrary.js';
import { Building } from './Building.js';
import PlacementResolver from './PlacementResolver.js';
import { Resource } from './Resource.js';

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
   * @param {string} buildingId The ID of the building being evaluated.
   * @param {import('./Map.js').default} map The game map.
   * @param {object[]} [appliedTransformations=[]] The list of transformation definitions that were applied to this building.
   * @returns {Array<{rule: string, reason: string, points: number}>} An array of score components.
   */
  evaluate(tile, buildingId, map, appliedTransformations = []) {
    throw new Error("Method 'evaluate()' must be implemented.");
  }
}



// --- New Scoring Rules ---

/**
 * Base score for any valid building placement.
 */
export class BasePlacementScore extends ScoringRule {
  evaluate(tile, buildingId, map, appliedTransformations) {
    const isValid = tile.contentType instanceof Building;

    return [{
      rule: "BasePlacementScore",
      reason: "Valid building placement",
      points: isValid ? 1 : 0,
    }];
  }
}

/**
 * A generic rule that awards points for any valid building transformation.
 * It reads the score and reason directly from the transformation's definition
 * in BuildingLibrary.js, with sensible defaults.
 */
export class TransformationScoreRule extends ScoringRule {
  evaluate(tile, buildingId, map, appliedTransformations) {
    const building = tile.contentType;
    if (!(building instanceof Building)) return [];

    const buildingDef = BuildingDefinitionMap.get(building.type);
    // This rule only applies to transformed buildings which have a baseId.
    if (!buildingDef || !buildingDef.baseId) {
      return [];
    }

    // The LuxuryHome has its own complex scoring rule, so we let that rule handle it exclusively.
    if (building.type === BuildingLibrary.LUXURY_HOME.id) {
      return [];
    }

    const baseBuildingDef = BuildingDefinitionMap.get(buildingDef.baseId);
    const transformation = baseBuildingDef?.transformations.find(t => t.id === building.type);

    if (!transformation) return [];

    const isNegative = transformation.isNegative || false;
    let score = transformation.score;

    // Apply default scores if not specified in the library.
    if (score === undefined) {
      score = isNegative ? -2 : 1;
    }

    if (score === 0) return [];

    const reason = transformation.reason || (isNegative ? 'Negative transformation' : 'Valid transformation');

    return [{
      rule: 'TransformationScoreRule',
      reason: reason,
      points: score,
    }];
  }
}

/**
 * A generic rule that awards points for an Industry building claiming a resource.
 * It checks for the data link between the building and the resource tile.
 */
export class ClaimedResourceScoreRule extends ScoringRule {
  evaluate(tile, buildingId, map, appliedTransformations) {
    const building = tile.contentType;
    // 1. Check if it's a building and if it has claimed a resource.
    // The `claimedResourceTile` property is our proof of a successful claim.
    if (!(building instanceof Building) || !building.claimedResourceTile) {
      return [];
    }

    // 2. Find the transformation definition to get scoring data.
    const buildingDef = BuildingDefinitionMap.get(building.type);
    if (!buildingDef || !buildingDef.baseId) {
      return [];
    }
    const baseBuildingDef = BuildingDefinitionMap.get(buildingDef.baseId);
    const transformation = baseBuildingDef?.transformations.find(t => t.id === building.type);

    if (!transformation) return [];

    // 3. Determine the score and reason, using defaults if not specified.
    const score = transformation.claimScore ?? 1; // Default to +1 if claimScore is not defined.
    const reason = transformation.claimReason || `Claimed nearby resource`;

    if (score === 0) return [];

    return [{ rule: 'ClaimedResourceScoreRule', reason, points: score }];
  }
}

/**
 * Score for placing a Luxury Home, based on the number of valid positive transformations.
 */
export class LuxuryHomeScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map, appliedTransformations = []) {
    const isLuxuryHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.LUXURY_HOME.id;
    if (!isLuxuryHome) {
      return []; // Return an empty array if not a LuxuryHome
    }

    // The score is now simply the number of positive transformations that were applied,
    // which is passed directly to this rule. This is more efficient and decouples
    // the scoring rule from the PlacementResolver's internal logic.
    const bonusCount = appliedTransformations.length;

    if (bonusCount === 0) return [];

    return [{
      rule: "LuxuryHomeScoringRule",
      reason: `Combined ${bonusCount} residential bonuses`,
      points: bonusCount,
    }];
  }
}

/**
 * A single collection of all available scoring rule classes.
 * This allows the ScoringEngine to dynamically register all rules without
 * needing to know their specific names.
 */
export const AllRules = {
  BasePlacementScore,
  TransformationScoreRule,
  ClaimedResourceScoreRule,
  LuxuryHomeScoringRule,
};