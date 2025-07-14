/**
 * @fileoverview Defines the Map class, which creates and manages the game world grid.
 */

import Config from './Config.js';
import HexTile from './HexTile.js';

/**
 * Manages the collection of HexTiles that form the game world.
 * It is responsible for generating the map and providing access to specific tiles.
 */
export default class Map {
  /**
   * Creates an instance of the Map.
   * It initializes an empty grid based on the dimensions in the Config file.
   * The grid must be populated by an external generator.
   */
  constructor() {
    /**
     * The width of the map in tiles.
     * @type {number}
     */
    this.width = Config.mapDimensions.width;

    /**
     * The height of the map in tiles.
     * @type {number}
     */
    this.height = Config.mapDimensions.height;

    /**
     * A 2D array representing the grid of tiles. Access tiles with grid[y][x].
     * @type {HexTile[][]}
     */
    this.grid = [];

    /**
     * A set of unique string IDs for every hex edge that contains a river.
     * @type {Set<string>}
     */
    this.rivers = new Set();
  }

  /**
   * Retrieves the tile at the specified x and y coordinates.
   * @param {number} x The horizontal coordinate of the tile.
   * @param {number} y The vertical coordinate of the tile.
   * @returns {HexTile|null} The HexTile at the given coordinates, or null if the coordinates are out of bounds.
   */
  getTileAt(x, y) {
    // Check that the row and tile exist before trying to access them.
    if (this.grid[y] && this.grid[y][x]) {
      return this.grid[y][x];
    }
    return null; // Return null if the coordinates are outside the map.
  }
}