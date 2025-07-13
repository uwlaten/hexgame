/**
 * @fileoverview Defines the Player class, representing a player in the game.
 */

/**
 * Represents a player, holding their score and other game-related state.
 */
export default class Player {
  /**
   * Creates an instance of a Player.
   */
  constructor() {
    /**
     * The player's current score.
     * @type {number}
     */
    this.score = 0;

    /**
     * The type of tile the player currently has selected to place on the map.
     * @type {string}
     */
    this.currentTileInHand = 'Residence';
  }
}