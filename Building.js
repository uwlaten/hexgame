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
    // In the future, this could hold instance-specific data like health or level.
  }

  /**
   * Creates a new Building instance with the same type.
   */
  clone() {
    return new Building(this.type);
  }
}