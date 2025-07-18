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

    this.cityCentrePlaced = false;
    this.hand = Config.PlayerConfig.initialHand[0]; // Start with the City Centre.

    this.deck = this._generateDeck(); // The main deck is now generated and shuffled immediately.
    this.deckSize = Config.PlayerConfig.initialDeckSize;

    // The type of tile the player currently has selected to place on the map.
    this.currentTileInHand = this.hand;

    // Announce the initial score so the UI can display it.
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }
  
  _generateDeck() {
    const deck = [];
    for (const [buildingId, count] of Object.entries(Config.PlayerConfig.mainDeck)) {
      for (let i = 0; i < count; i++) {
        deck.push(buildingId);
      }
    }
    return this._shuffleArray(deck);
  }

  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Resets the player's state to the beginning of a new game.
   */
  reset() {
    // Mirror the initial state from the constructor.
    this.score = 0;
    this.cityCentrePlaced = false;
    this.hand = Config.PlayerConfig.initialHand[0];
    this.deck = this._generateDeck(); // Also regenerate the deck on reset.
    this.currentTileInHand = this.hand;

    // Announce the reset state to the UI.
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }

  /**
   * Draws a new building type from the player's deck to their hand.
   * Emits a PLAYER_TILE_HAND_UPDATED event.
   */
  drawNewTile() {
    if (!this.cityCentrePlaced) {
      // City Centre not placed yet, no drawing from the main deck.
      this.currentTileInHand = this.hand;
    } else if (this.deck.length > 0) {
      // Main deck exists and has tiles: draw one.
      this.currentTileInHand = this.deck.pop(); // Draw from the end (more efficient).
    } else {
      // Main deck is empty.
      this.currentTileInHand = null;
      // Announce that the game is over because the player has no more tiles.
      this.eventEmitter.emit('GAME_OVER');
    }
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }
}
