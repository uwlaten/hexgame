/**
 * @fileoverview Defines the rules for placing content on tiles.
 * This module acts as a centralized "rulebook" for the game.
 * This module acts as a centralized "rulebook" for the game.
 */

import HexGridUtils from './HexGridUtils.js';
import { Building } from './Building.js';

/**
 * A static class that provides methods to validate game actions,
 * starting with building placement.
 */
export default class PlacementRules {
  /**
   * Checks if a given building type can be placed on a specific tile by a player.
   * @param {import('./HexTile.js').default} tile The target tile for placement.
   * @param {string} buildingType The ID of the building from BuildingLibrary (e.g., 'Residence').
   * @param {import('./Player.js').default} player The player attempting the action.
   * @returns {boolean} True if the placement is valid according to all rules, false otherwise.
   * @param {import('./Map.js').default} map The game map, to check adjacency.
   */
  static canPlaceBuilding(tile, buildingType, player, map) {
    // --- Universal Blocking Rules ---
    // Rule 1: The tile must be empty (no existing building *or* resource).
    if (tile.contentType) return false;

    // Rule 2: The tile's biome must be designated as buildable.
    if (!tile.biome.isBuildable) return false;

    // Rule 3: Cannot build on Oasis features.
    if (tile.feature?.id === 'oasis') return false;
    //console.log(`Tile (${tile.x}, ${tile.y}) feature:`, tile.feature); // Debugging

    // --- Adjacency Rule ---
    // Rule 4: Must be adjacent to an existing building, unless placing the City Centre.
    if (!player.cityCentrePlaced) {
      // If the City Centre hasn't been placed, only allow the City Centre to be placed.
      return buildingType === 'CityCentre';
    }

    // If we get here, the City Centre has been placed, so all other buildings must be adjacent.
    if (!this._isAdjacentToBuilding(tile, map)) {
      return false;
    }

    return true;
  }

  // --- Adjacency Rule ---
  // Rule 4: Must be adjacent to an existing building (unless placing the City Centre).
  static _isAdjacentToBuilding(tile, map) {
    return HexGridUtils.getNeighbors(tile.x, tile.y).some(coord => {
      const neighbor = map.getTileAt(coord.x, coord.y);
      // Ensure the neighbor exists and has a building on it.
      return neighbor && neighbor.contentType instanceof Building;
    });
  }
}