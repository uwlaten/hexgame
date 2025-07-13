/**
 * @fileoverview Defines the rules for placing content on tiles.
 * This module acts as a centralized "rulebook" for the game.
 */

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
   */
  static canPlaceBuilding(tile, buildingType, player) {
    // Rule 1: The tile must be empty (cannot have existing content).
    if (tile.contentType) {
      return false;
    }

    // Rule 2: The tile's biome must be designated as buildable.
    return tile.biome.isBuildable;
  }
}