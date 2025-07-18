/**
 * @fileoverview Defines the PlacementResolver class, which determines the outcome
 * of a building placement action, including transformations and scoring.
 */

import PlacementRules from './PlacementRules.js';
import { BuildingLibrary, BuildingDefinitionMap } from './BuildingLibrary.js';
import HexGridUtils from './HexGridUtils.js';
import ScoringEngine from './ScoringEngine.js';
import { Building } from './Building.js';
import { Resource } from './Resource.js';

/**
 * A static class that acts as the central engine for resolving building placements.
 * It encapsulates the complex logic of checking rules, finding transformations,
 * and applying scoring logic.
 */
export default class PlacementResolver {
  /**
   * Resolves a potential building placement to determine the final outcome.
   * This includes checking for blocks, finding transformations, and calculating scores.
   * @param {string} baseBuildingId The ID of the building the player is trying to place.
   * @param {import('./HexTile.js').default} targetTile The tile where placement is attempted.
   * @param {import('./Map.js').default} map The game map.
   * @param {import('./Player.js').default} player The player making the placement.
   * @returns {{isValid: boolean, resolvedBuildingId: string|null, score: number}} An object describing the outcome.
   */
  static resolvePlacement(baseBuildingId, targetTile, map, player) {
    
    //console.log(`resolvePlacement called for (${targetTile.x}, ${targetTile.y}), building: ${baseBuildingId}`);  // Debugging
    
    // Phase 1: Basic Placement Rules (Blocking)
    // Delegate the initial hard-blocking checks to PlacementRules.
    const canPlace = PlacementRules.canPlaceBuilding(targetTile, baseBuildingId, player, map);

    if (!canPlace) return { isValid: false, resolvedBuildingId: null, score: 0 };

    // Phase 3: Find and Score All Possible Transformations
    const baseBuildingDef = BuildingDefinitionMap.get(baseBuildingId);
    const possibleOutcomes = this._getPossibleOutcomes(baseBuildingDef, targetTile, map);

    // Pre-Phase 4: Determine the final outcome *before* the reciprocal check.
    // This way, we know the resolved building type.
    const finalOutcome = this._determineFinalOutcome(possibleOutcomes, baseBuildingDef, targetTile, map);

    // Phase 2: Reciprocal Negative Check
    // Re-check if placing this building would invalidate a future placement on an adjacent tile.
    // Now that we know the final outcome, we can check using the resolved building ID.
    if (this._preservesAdjacentValue(finalOutcome.id, targetTile, map, player, finalOutcome.id)) {
      return { isValid: false, resolvedBuildingId: null, score: 0 };
    }

    // Phase 4: Determine the Final Outcome based on game rules
    // This phase is now handled earlier, but we still return the same structure.

    return {
      isValid: true,
      resolvedBuildingId: finalOutcome.id,
      score: finalOutcome.score,
    };
  }

  /**
   * Checks if placing a building would create a negative-scoring situation for adjacent tiles.
   * @private
   */
  static _preservesAdjacentValue(placingId, placingTile, map, player, resolvedBuildingId) {
    // 1. Only Loop Through Existing Buildings
    const neighbors = HexGridUtils.getNeighbors(placingTile.x, placingTile.y)
      .map(c => map.getTileAt(c.x, c.y)).filter(Boolean);

    for (const neighborTile of neighbors) {
      let baseBuildingDefsToCheck = [];
      // Check against existing buildings
      if (neighborTile.contentType instanceof Building) {
        const existingBuildingDef = BuildingDefinitionMap.get(neighborTile.contentType.type);
        baseBuildingDefsToCheck.push(BuildingDefinitionMap.get(existingBuildingDef.baseId) || existingBuildingDef);
      }
      
      // 2. Implement the "What If" Test
      for (const baseDef of baseBuildingDefsToCheck) {        
        const hypotheticalOutcomes = this._getPossibleOutcomes(
          baseDef, neighborTile, map,
          { hypotheticalNeighbor: { tile: placingTile, buildingId: resolvedBuildingId } }
        );
        const currentScore = ScoringEngine.calculateScoreFor(neighborTile.contentType.type, neighborTile, map);
        const hypotheticalFinalOutcome = this._determineFinalOutcome(hypotheticalOutcomes, baseDef, neighborTile, map);

        // 3. Updated Final Condition
        if (currentScore.total >= 0 && hypotheticalFinalOutcome.score.total < 0) return true;


      }      
    }
    return false; // No adjacent value preservation failures found.
  }

  /**
   * Finds all valid transformations for a building on a tile and calculates their scores.
   * @param {object} context - Optional context for hypothetical checks.
   * @private
   */
  static _getPossibleOutcomes(baseBuildingDef, targetTile, map, context = {}) {
    if (!baseBuildingDef.transformations) return [];

    const outcomes = [];
    for (const transform of baseBuildingDef.transformations) {
      // Use the original tile for checking conditions against the current game state.
      if (this._checkConditions(targetTile, transform.conditions, map, context)) {
        // For scoring, create a clone and place the hypothetical building on it.
        const clonedTile = targetTile.clone();
        const tempBuilding = new Building(transform.id);
        clonedTile.setContent(tempBuilding);

        // --- Simulate resource claim for scoring ---
        // This is crucial for the ClaimedResourceScoreRule to work during hypothetical checks.
        const buildingDef = BuildingDefinitionMap.get(transform.id);
        const resourceToClaim = buildingDef?.claimsResource;
        if (resourceToClaim) {
          const neighbors = HexGridUtils.getNeighbors(targetTile.x, targetTile.y);
          for (const coord of neighbors) {
            const neighborTile = map.getTileAt(coord.x, coord.y);
            if (neighborTile?.contentType instanceof Resource &&
                neighborTile.contentType.type === resourceToClaim &&
                !neighborTile.contentType.isClaimed) {
              tempBuilding.claimedResourceTile = neighborTile; // Set the link on the temporary building.
              break; // A building only claims one resource.
            }
          }
        }

        // Calculate score on the cloned, modified tile. The original tile is untouched.
        const score = ScoringEngine.calculateScoreFor(transform.id, clonedTile, map);
        outcomes.push({ id: transform.id, isNegative: transform.isNegative || false, score });
      }
    }
    return outcomes;
  }

  /**
   * Determines the final building and score from a list of possible outcomes.
   * @private
   */
  static _determineFinalOutcome(outcomes, baseBuildingDef, targetTile, map) {
    // Rule: Negative transformations trump all positives.
    const negativeOutcome = outcomes.find(o => o.isNegative && o.score.total < 0);
    if (negativeOutcome) return negativeOutcome;

    const positiveOutcomes = outcomes.filter(o => !o.isNegative);

    // If no transformations apply, return the base building.
    if (positiveOutcomes.length === 0) {
      const clonedTile = targetTile.clone();
      const tempBuilding = new Building(baseBuildingDef.id);
      clonedTile.setContent(tempBuilding);
      const score = ScoringEngine.calculateScoreFor(baseBuildingDef.id, clonedTile, map);
      return { id: baseBuildingDef.id, score };
    }

    // Handle 'additive' model (e.g., Residence)
    if (baseBuildingDef.transformModel === 'additive') {
      if (positiveOutcomes.length > 1) {
        // Calculate the score for the special combined building.
        const resolvedId = baseBuildingDef.additiveResultId;
        const clonedTile = targetTile.clone();
        const tempBuilding = new Building(resolvedId);
        clonedTile.setContent(tempBuilding);
        const score = ScoringEngine.calculateScoreFor(resolvedId, clonedTile, map);
        return { id: resolvedId, score };
      }
    }

    // Handle 'exclusive' model or single positive transformations.
    // Sort by score (highest first) and return the best one.
    // Note: The score object now has a 'total' property.
    positiveOutcomes.sort((a, b) => b.score.total - a.score.total);
    return positiveOutcomes[0];
  }

  /**
   * Checks if a tile meets a set of conditions.
   * @private
   */
  static _checkConditions(tile, conditions, map, context) {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      let success = false;
      switch (condition.type) {
        case 'feature':
          success = tile.feature?.id === condition.id;
          break;
        case 'onBiome':
          success = Array.isArray(condition.id)
            ? condition.id.includes(tile.biome.id)
            : tile.biome.id === condition.id;
          break;
        case 'adjacentToRiver':
          const vertices = HexGridUtils.getVerticesForTile(tile, map);
          success = vertices.some((v, i) =>
            map.rivers.has(HexGridUtils.getEdgeId(v, vertices[(i + 1) % vertices.length]))
          );
          break;
        case 'adjacentToBuilding':
          const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const buildingIds = Array.isArray(condition.id) ? condition.id : [condition.id];
          success = neighbors.some(n => {
            if (context.hypotheticalNeighbor && n === context.hypotheticalNeighbor.tile) {
              return buildingIds.includes(context.hypotheticalNeighbor.buildingId);
            }
            return n.contentType instanceof Building && buildingIds.includes(n.contentType.type);
          });
          break;
        case 'adjacentToBiome':
          const neighborsForBiome = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const biomeIds = Array.isArray(condition.id) ? condition.id : [condition.id];
          success = neighborsForBiome.some(n => biomeIds.includes(n.biome.id));
          break;
        case 'adjacentToFeature':
          const neighborsForFeature = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const featureIds = Array.isArray(condition.id) ? condition.id : [condition.id];
          // A neighbor has a feature, and that feature's ID is in our list of desired features.
          success = neighborsForFeature.some(n => n.feature && featureIds.includes(n.feature.id));
          break;
        case 'adjacentToResource':
          const neighborsForResource = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          success = neighborsForResource.some(n =>
            n.contentType instanceof Resource &&
            n.contentType.type === condition.id &&
            !n.contentType.isClaimed
          );
          break;
        case 'neighbor': // Generic neighbor property check
          const neighborsForProp = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const matchCount = neighborsForProp.filter(n => this._getPropertyByPath(n, condition.property) === condition.value).length;

          if (condition.operator === 'atLeast' && matchCount >= condition.count) success = true;
          if (condition.operator === 'exactly' && matchCount === condition.count) success = true;
          break;
      }

      // NEW: Handle inverted conditions.
      // If the condition has an 'invert' flag, we flip the result.
      if (condition.invert) {
        success = !success;
      }
      if (!success) return false; // If any condition fails, the whole check fails.
    }
    return true; // All conditions passed.
  }

  /**
   * Safely gets a nested property from an object using a string path.
   * @private
   */
  static _getPropertyByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }
}