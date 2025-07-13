/**
 * @fileoverview Defines the Player class, representing a player in the game.
 */
import { BuildingLibrary } from './BuildingLibrary.js';

/**
 * Represents a player, holding their score and other game-related state.
 */
export default class Player {
  /**
   * Creates an instance of a Player.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    /**
     * The player's current score.
     * @type {number}
     */
    this.score = 0;

    /**
     * The collection of building types the player can draw from.
     * @type {string[]}
     */
    this.deck = [
      BuildingLibrary.RESIDENCE.id,
      BuildingLibrary.RESIDENCE.id,
      BuildingLibrary.RESIDENCE.id,
      BuildingLibrary.RESIDENCE.id,
      BuildingLibrary.RESIDENCE.id,
    ];

    /**
     * The type of tile the player currently has selected to place on the map.
     * @type {string|null} This should be an ID from the BuildingLibrary.
     */
    this.currentTileInHand = null;

    this.drawNewTile();
  }

  /**
   * Draws a new building type from the player's deck to their hand.
   * Emits a PLAYER_TILE_HAND_UPDATED event.
   */
  drawNewTile() {
    if (this.deck.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.deck.length);
      const [drawnTile] = this.deck.splice(randomIndex, 1);
      this.currentTileInHand = drawnTile;
    } else {
      console.warn('Player deck is empty. Cannot draw a new tile.');
      this.currentTileInHand = null;
    }

    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED', this.currentTileInHand);
  }
}