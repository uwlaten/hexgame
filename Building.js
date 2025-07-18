/**
 * @fileoverview Defines the Building class, representing structures on tiles.
 */

/**
 * Represents a building constructed on a tile.
 * An instance of this class would be stored in a HexTile's `contentType`.
 */
export class Building {
  /**
   * @param {string} type The type of the building (e.g., 'Residence').
   */
  constructor(type) {
    this.type = type;
    /**
     * A reference to the HexTile containing the resource this building has claimed.
     * This is only used by resource-claiming Industry buildings.
     * @type {import('./HexTile.js').default|null}
     */
    this.claimedResourceTile = null;
  }

  /**
   * Creates a new Building instance with the same type and properties.
   */
  clone() {
    const newBuilding = new Building(this.type);
    // When cloning, we need to carry over the claimed resource link if it exists.
    // This is important for hypothetical checks that might need to know about existing claims.
    newBuilding.claimedResourceTile = this.claimedResourceTile;
    return newBuilding;
  }
}