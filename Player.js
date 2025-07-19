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
     * Tracks if the initial City Centre has been placed.
     * @type {boolean}
     */
    this.cityCentrePlaced = false;
    /**
     * The player's hand of selectable tiles.
     * @type {string[]}
     */
    this.hand = [];
    /**
     * The player's draw pile.
     * @type {string[]}
     */
    this.deck = [];
    /**
     * The index of the currently selected tile in the hand.
     * @type {number}
     */
    this.activeTileIndex = 0;

    // The reset method will handle the initial setup.
    // Pass null for map initially; it will be set on game start/reset.
    this.reset(null);
  }
  
  /**
   * Generates the player's main deck, scaling the number of tiles based on map size.
   * @param {import('./Map.js').default | null} map The game map, used to determine scaling.
   * @returns {string[]} A shuffled array of building IDs for the deck.
   * @private
   */
  _generateDeck(map) {
    // If no map is provided (e.g., on initial constructor call), return an empty deck.
    if (!map) return [];

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
   * @param {import('./Map.js').default | null} map The game map, required to generate a scaled deck. Can be null on initial setup.
   */
  reset(map) {
    this.score = 0;
    this.cityCentrePlaced = false;
    // Start with the City Centre as the only tile in hand.
    this.hand = [...Config.PlayerConfig.initialHand];
    this.deck = this._generateDeck(map); // Regenerate the deck using the map for scaling.
    this.activeTileIndex = 0;

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
   * Gets the ID of the currently selected tile from the hand.
   * @returns {string|null}
   */
  getActiveTile() {
    return this.hand[this.activeTileIndex] || null;
  }

  /**
   * Switches the active tile in the hand to the next available choice.
   */
  swapActiveTile() {
    if (this.hand.length > 1) {
      this.activeTileIndex = (this.activeTileIndex + 1) % this.hand.length;
      // Announce the change so the UI can update previews
      this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
    }
  }

  /**
   * Fills the player's hand from the deck after the City Centre is placed.
   */
  drawInitialHand() {
    this.hand = []; // Clear the City Centre
    const handSize = Config.PlayerConfig.handSize || 2;
    for (let i = 0; i < handSize; i++) {
      if (this.deck.length > 0) {
        this.hand.push(this.deck.pop());
      }
    }
    this.activeTileIndex = 0;
    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }

  /**
   * Removes the placed tile from the hand and draws a replacement from the deck.
   * @param {number} placedTileIndex The index in the hand of the tile that was placed.
   */
  placeTileAndReplenish(placedTileIndex) {
    if (placedTileIndex < 0 || placedTileIndex >= this.hand.length) {
      console.error(`Invalid index for placed tile: ${placedTileIndex}`);
      return;
    }

    // Remove the placed tile
    this.hand.splice(placedTileIndex, 1);

    // Draw a replacement if the deck has tiles
    if (this.deck.length > 0) {
      this.hand.push(this.deck.pop());
    }

    // Reset active tile index, ensuring it's valid and defaults to the first tile.
    this.activeTileIndex = 0;

    if (this.hand.length === 0) {
      this.eventEmitter.emit('GAME_OVER');
    }

    this.eventEmitter.emit('PLAYER_TILE_HAND_UPDATED');
  }
}
