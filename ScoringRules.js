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
   * @returns {number} The score awarded by this rule.
   */
  evaluate(tile, buildingId, map) {
    throw new Error("Method 'evaluate()' must be implemented.");
  }
}



// --- New Scoring Rules ---

/**
 * Base score for any valid building placement.
 */
export class BasePlacementScore extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isValid = tile.contentType instanceof Building;

    return [{
      rule: "BasePlacementScore",
      reason: "Valid building placement",
      points: isValid ? 1 : 0,
    }];
  }
}




/**
 * Score for placing a Mine.
 */
export class MineScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isMine = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.MINE.id;

    return [{
      rule: "MineScoringRule",
      reason: "Mine placed",
      points: isMine ? 1 : 0,
    }];
  }
}

/**
 * Score for placing an Iron Mine, including resource claim.
 */
export class IronMineScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isIronMine = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.IRON_MINE.id;

    const isAdjacentToIron = isIronMine && HexGridUtils.getNeighbors(tile.x, tile.y).some(coord => {
      const neighbor = tile.map.getTileAt(coord.x, coord.y);
      return neighbor?.contentType instanceof Resource &&
             neighbor.contentType.type === 'Iron' &&
             !neighbor.contentType.isClaimed;
    });

    const breakdown = [];
    if (isIronMine) {
      breakdown.push({
        rule: "IronMineScoringRule",
        reason: "Iron Mine placed",
        points: 1,
      });
      if (isAdjacentToIron) {
        breakdown.push({
          rule: "IronMineScoringRule",
          reason: "Adjacent to unclaimed Iron",
          points: 1,
        });
      }
    }

    return breakdown;
  }
}

/**
 * Score for placing a Quarry, including resource claim.
 */
export class QuarryScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isQuarry = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.QUARRY.id;

    const isAdjacentToStone = isQuarry && HexGridUtils.getNeighbors(tile.x, tile.y).some(coord => {
      const neighbor = tile.map.getTileAt(coord.x, coord.y);
      return neighbor?.contentType instanceof Resource &&
             neighbor.contentType.type === 'Stone' &&
             !neighbor.contentType.isClaimed;
    });

    const breakdown = [];
    if (isQuarry) {
      breakdown.push({
        rule: "QuarryScoringRule",
        reason: "Quarry placed",
        points: 1,
      });
      if (isAdjacentToStone) {
        breakdown.push({
          rule: "QuarryScoringRule",
          reason: "Adjacent to unclaimed Stone",
          points: 1,
        });
      }
    }
    return breakdown;
  }
}

/**
 * Score for placing a Polluted Slum (negative score).
 */
export class PollutedSlumScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isPollutedSlum = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.POLLUTED_SLUM.id;

    return [{
      rule: "PollutedSlumScoringRule",
      reason: "Negative transformation to Polluted Slum",
      points: isPollutedSlum ? -2 : 0,
    }];
  }
}

/**
 * Score for placing a Hilltop Villa.
 */
export class HilltopVillaScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isHilltopVilla = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.HILLTOP_VILLA.id;

    return [{
      rule: "HilltopVillaScoringRule",
      reason: "Positive transformation to Hilltop Villa",
      points: isHilltopVilla ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Riverfront Home.
 */
export class RiversideHomeScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isRiversideHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.RIVERSIDE_HOME.id;

    return [{
      rule: "RiversideHomeScoringRule",
      reason: "Positive transformation to Riverside Home",
      points: isRiversideHome ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Woodland Retreat.
 */
export class WoodlandRetreatScoringRule extends  ScoringRule {
  evaluate(tile, buildingId, map) {
    const isWoodlandRetreat = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.WOODLAND_RETREAT.id;

    return [{
      rule: "WoodlandRetreatScoringRule",
      reason: "Positive transformation to Woodland Retreat",
      points: isWoodlandRetreat ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Desert Hub.
 */
export class DesertHubScoringRule extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isDesertHub = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.DESERT_HUB.id;
    return [{
      rule: "DesertHubScoringRule",
      reason: "Positive transformation to Desert Hub",
      points: isDesertHub ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Seafront Home.
 */
export class SeafrontHomesScoringRule extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isSeafrontHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.SEAFRONT_HOMES.id;
    return [{
      rule: "SeafrontHomesScoringRule",
      reason: "Positive transformation to Seafront Home",
      points: isSeafrontHome ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Lake Lodge.
 */
export class LakeLodgesScoringRule extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isLakeLodge = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.LAKE_LODGES.id;
    return [{
      rule: "LakeLodgesScoringRule",
      reason: "Positive transformation to Lake Lodge",
      points: isLakeLodge ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Mountain Views home.
 */
export class MountainViewsScoringRule extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isMountainViews = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.MOUNTAIN_VIEWS.id;
    return [{
      rule: "MountainViewsScoringRule",
      reason: "Positive transformation to Mountain Views",
      points: isMountainViews ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Luxury Home, based on the number of valid positive transformations.
 */
export class LuxuryHomeScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isLuxuryHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.LUXURY_HOME.id;
    if (!isLuxuryHome) {
      return []; // Return an empty array if not a LuxuryHome
    }
  
    // 1. Get the base building definition and its positive transformations.
    const baseBuildingDef = BuildingDefinitionMap.get(BuildingLibrary.RESIDENCE.id);
    const positiveTransformations = baseBuildingDef.transformations.filter(t => !t.isNegative);
  
    // 2. Count how many transformations are valid on this tile.
    let validBonusCount = 0;
    for (const transform of positiveTransformations) {
      if (PlacementResolver._checkConditions(tile, transform.conditions, map)) {
        validBonusCount++;
      }
    }
  
    // 3. Return the count as the score.
    const breakdown = [];
    breakdown.push({ rule: "LuxuryHomeScoringRule", reason: "Valid residential bonuses", points: validBonusCount });
    
    return breakdown;
  }  
}

/**
 * Score for placing a Bridge.
 */
export class BridgeScoringRule extends ScoringRule {
  evaluate(tile, buildingId, map) {
    const isBridge = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.BRIDGE.id;

    return [{
      rule: "BridgeScoringRule",
      reason: "Bridge placed",
      points: isBridge ? 1 : 0,
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
  MineScoringRule,
  IronMineScoringRule,
  QuarryScoringRule,
  PollutedSlumScoringRule,
  HilltopVillaScoringRule,
  RiversideHomeScoringRule,
  WoodlandRetreatScoringRule,
  DesertHubScoringRule,
  SeafrontHomesScoringRule,
  LakeLodgesScoringRule,
  MountainViewsScoringRule,
  BridgeScoringRule,
  LuxuryHomeScoringRule,
};