/**
 * @fileoverview This file contains the central configuration for the game.
 * It includes settings for the map, biomes, and other global parameters
 * to make tweaking the game's balance and feel easier.
 */

// Using export default to make it easy to import this single config object elsewhere.
export default {
  /**
   * Defines the dimensions of the game map in tiles.
   * width: The number of tiles horizontally.
   * height: The number of tiles vertically.
   */
  mapDimensions: {
    width: 30,
    height: 20,
  },

  /**
   * A list of all possible biome types that can appear on a game tile.
   * This list can be used for map generation and to determine tile properties.
   */
  biomes: [
    'ocean',
    'mountain',
    'desert',
    'grassland',
    'plains',
    'tundra',
    'lake',
  ],
};