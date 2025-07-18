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

    /**
     * A reference to the Building instance that has claimed this resource.
     * @type {import('./Building.js').Building|null}
     */
    this.claimedBy = null;
  }

  clone() {
    const newResource = new Resource(this.type);
    // When cloning, we need to carry over the claimed state. This is important
    // for hypothetical checks to know that a resource is already taken.
    newResource.isClaimed = this.isClaimed;
    // Also copy the reference to the claiming building.
    newResource.claimedBy = this.claimedBy;
    return newResource;
  }
}