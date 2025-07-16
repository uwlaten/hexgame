/**
 * @fileoverview Defines a library of rules for calculating player scores.
 * This creates a flexible, data-driven scoring system.
 * This creates a flexible, data-driven scoring system.
 */

import { BuildingLibrary, BuildingDefinitionMap } from './BuildingLibrary.js';
import HexGridUtils from './HexGridUtils.js';
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
      return neighbor?.contentType?.id === 'Iron';
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
      return neighbor?.contentType?.id === 'Stone';
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
export class RiverfrontHomeScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isRiverfrontHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.RIVERFRONT_HOME.id;

    return [{
      rule: "RiverfrontHomeScoringRule",
      reason: "Positive transformation to Riverfront Home",
      points: isRiverfrontHome ? 1 : 0,
    }];
  }
}

/**
 * Score for placing a Luxury Home (multiple adjacency bonuses).
 */
export class LuxuryHomeScoringRule extends ScoringRule{
  evaluate(tile, buildingId, map) {
    const isLuxuryHome = tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.LUXURY_HOME.id;
    const isHilltop = isLuxuryHome && tile.feature?.id === 'hills';
    const isRiverfront = isLuxuryHome && HexGridUtils.getNeighbors(tile.x, tile.y).some(coord => {
        const neighbor = map.getTileAt(coord.x, coord.y);
        if (!neighbor) {
            return false;
        }

        return HexGridUtils.getVerticesForTile(neighbor, map).some(vertexId => this._isRiverAtVertex(vertexId, map));
    });

    const breakdown = [];
    if (isLuxuryHome) {
      breakdown.push({
        rule: "LuxuryHomeScoringRule",
        reason: "Positive transformation to Luxury Home",
        points: 1,
      });
      if (isHilltop) {
        breakdown.push({
          rule: "LuxuryHomeScoringRule",
          reason: "Residential bonus for being on Hills",
          points: 1,
        });
      }
      if (isRiverfront) {
        breakdown.push({
          rule: "LuxuryHomeScoringRule",
          reason: "Residential bonus for being adjacent to a River",
          points: 1,
        });
      }
    }
    return breakdown;
  }

    _isRiverAtVertex(vertexId, map) {
        const tileCoords = HexGridUtils.getTilesForVertex(vertexId);
        for (let i = 0; i < tileCoords.length; i++) {
            const tile1 = tileCoords[i];
            const tile2 = tileCoords[(i + 1) % tileCoords.length];
            const edgeId = HexGridUtils.getEdgeId(HexGridUtils.getVertexIdFromTiles(tile1, tile2, tileCoords[(i+2) % tileCoords.length]), HexGridUtils.getVertexIdFromTiles(tile2, tile1, tileCoords[i]));
            if (map.rivers.has(edgeId)) return true;
        }
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
  RiverfrontHomeScoringRule,
  LuxuryHomeScoringRule,
  BridgeScoringRule,
  
};