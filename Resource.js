/**
 * @fileoverview Defines the Resource class, representing resources on tiles.
 */

/**
 * Represents a resource placed on a tile.
 * An instance of this class would be stored in a HexTile's `contentType`.
 */
export class Resource {
  /**
   * @param {string} type The type of the resource (e.g., 'Iron').
   */
  constructor(type) {
    /**
     * The type of the resource.
     * @type {string}
     */
    this.type = type;

    /**
     * Whether this specific resource instance has been claimed by a building.
     * @type {boolean}
     */
    this.isClaimed = false;
  }

  clone() {
    return new Resource(this.type);
  }
}