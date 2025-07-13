/**
 * @fileoverview Defines the HexTile class, which represents a single
 * hexagonal tile on the game map.
 */

/**
 * Represents a single tile in the game world.
 * Each tile has coordinates, a biome, and can optionally contain features
 * (like forests or hills) and content (like units or cities).
 */
export default class HexTile {
  /**
   * Creates an instance of a HexTile.
   * @param {number} x The horizontal coordinate of the tile.
   * @param {number} y The vertical coordinate of the tile.
   * @param {string} biomeType The type of terrain, e.g., 'grassland', 'ocean'.
   *   This should correspond to a value in the `biomes` array in Config.js.
   * @param {string|null} [featureType=null] A feature on the tile, e.g., 'forest'. Defaults to null.
   * @param {object|null} [contentType=null] Any content on the tile, like a Unit or City object. Defaults to null.
   */
  constructor(x, y, biomeType, featureType = null, contentType = null) {
    /**
     * The horizontal position of the tile in the grid.
     * @type {number}
     */
    this.x = x;

    /**
     * The vertical position of the tile in the grid.
     * @type {number}
     */
    this.y = y;

    /**
     * The biome of the tile, determining its basic properties (e.g., movement cost).
     * @type {string}
     */
    this.biomeType = biomeType;

    /**
     * A geographical feature on the tile, which can modify its properties.
     * @type {string|null}
     */
    this.featureType = featureType;

    /**
     * The primary content occupying the tile, either a Building or Resource.
     * @type {object|null}
     */
    this.contentType = contentType;
  }
}