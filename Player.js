/**
 * @fileoverview Defines the Player class, representing a player in the game.
 */
import Config from './Config.js';
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
    this.deck = this._getInitialDeck();

    /**
     * The type of tile the player currently has selected to place on the map.
     * @type {string|null} This should be an ID from the BuildingLibrary.
     */
    this.currentTileInHand = null;

    this.drawNewTile();

    // Announce the initial score so the UI can display it.
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
  }

  /**
   * Resets the player's state to the beginning of a new game.
   */
  reset() {
    this.score = 0;
    this.deck = this._getInitialDeck();
    this.drawNewTile(); // This will emit hand and score updates
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
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

  /**
   * Returns the initial set of cards for the player's deck.
   * @returns {string[]}
   * @private
   */
  _getInitialDeck() {
    // Return a copy to prevent mutation of the original config array.
    return [...Config.PlayerConfig.initialDeck];
  }
}