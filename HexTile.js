/**
 * @fileoverview Defines the HexTile class, which represents a single
 * hexagonal tile on the game map.
 */
import { Building } from './Building.js';

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
   * @param {object} biome The biome object for this tile, from BiomeLibrary.
   * @param {object|null} [feature=null] A feature object on the tile, from FeatureLibrary. Defaults to null.
   * @param {Building|object|null} [initialContent=null] Any initial content on the tile (Building instance or Resource definition). Defaults to null.
   * @param {import('./Map.js').default} map The map object this tile belongs to.
   */
   constructor(x, y, biome, feature = null, initialContent = null, map = null) {
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
     * @type {object}
     */
    this.biome = biome;

    /**
     * A geographical feature on the tile, which can modify its properties.
     * @type {object|null}
     */
    this.feature = feature;

    /**
     * The primary content occupying the tile, either a Building or Resource.
     * This should be managed via the setContent() method.
     * @type {Building|object|null}
     * @private
     */
    this.contentType = null;

    /**
     * A reference to the map object that contains this tile.
     * @type {import('./Map.js').default|null}
     */
    this.map = map; // Store the map reference

    this.setContent(initialContent);
  }

  /**
   * Sets the content of the tile, which can be a Building instance or a Resource object.
   * @param {Building|object|null} content The content to place on the tile.
   */
  setContent(content) {
    const isResourceDefinition = content && typeof content === 'object' && content.id;

    if (content === null || content instanceof Building || isResourceDefinition) {
      this.contentType = content;
    } else {
      console.error('Invalid content type. Must be a Building, a valid Resource from ResourceLibrary, or null.', content);
    }
  }

  /**
   * Clears any content from the tile.
   */
  clearContent() {
    this.contentType = null;
  }

  /**
   * Creates a deep copy of this tile.
   * This is crucial for hypothetical calculations without modifying the original game state.
   * @returns {HexTile} A new HexTile instance that is a copy of this one.
   */
  clone() {
    // The constructor handles all properties correctly, including setting the content.
    return new HexTile(this.x, this.y, this.biome, this.feature, this.contentType, this.map);
  }
}