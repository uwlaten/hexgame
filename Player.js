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

    // The deck is now generated via the reset() method, which has access to the map.
    this.deck = [];
    this.currentTileInHand = this.hand;

    // Announce the initial score so the UI can display it.
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }
  
  /**
   * Generates the player's main deck, scaling the number of tiles based on map size.
   * @param {import('./Map.js').default} map The game map, used to determine scaling.
   * @returns {string[]} A shuffled array of building IDs for the deck.
   * @private
   */
  _generateDeck(map) {
    const deck = [];
    const { deckScaling, mainDeck } = Config.PlayerConfig;

    // Calculate the scaling factor based on map area.
    const actualMapArea = map.width * map.height;
    const scalingFactor = actualMapArea / deckScaling.baseMapArea;

    for (const [buildingId, scalingConfig] of Object.entries(mainDeck)) {
      const { baseCount, min, max } = scalingConfig;

      // Calculate the raw scaled count and then clamp it between min and max.
      const scaledCount = Math.round(baseCount * scalingFactor);
      const finalCount = Math.max(min, Math.min(scaledCount, max));

      for (let i = 0; i < finalCount; i++) {
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
   * @param {import('./Map.js').default} map The game map, required to generate a scaled deck.
   */
  reset(map) {
    // Mirror the initial state from the constructor.
    this.score = 0;
    this.cityCentrePlaced = false;
    this.hand = Config.PlayerConfig.initialHand[0];
    this.deck = this._generateDeck(map); // Regenerate the deck using the map for scaling.
    this.currentTileInHand = this.hand;

    // Announce the reset state to the UI.
    this.eventEmitter.emit('SCORE_UPDATED', this.score);
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }

  /**
   * Adds an array of new tiles to the player's deck and shuffles it.
   * @param {string[]} tilesToAdd An array of building IDs to add to the deck.
   */
  addTilesToDeck(tilesToAdd) {
    if (!tilesToAdd || tilesToAdd.length === 0) return;

    // Add each new tile to the deck.
    for (const tileId of tilesToAdd) {
      this.deck.push(tileId);
    }

    // Shuffle the deck to integrate the new tiles.
    this._shuffleArray(this.deck);

    // Announce that the deck has changed so the UI can update.
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
