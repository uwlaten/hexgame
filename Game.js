/**
 * @fileoverview Defines the main Game class, which orchestrates game logic.
 */

/**
 * Manages the overall game state, player actions, and game rules.
 * It listens for events and updates the game world accordingly.
 */
export default class Game {
  /**
   * Creates an instance of the Game.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Player.js').default} player The player instance.
   */
  constructor(eventEmitter, player) {
    this.eventEmitter = eventEmitter;
    this.player = player;
  }

  /**
   * Initializes the game by setting up event listeners.
   */
  init() {
    this.eventEmitter.on('HEX_CLICKED', this._handleHexClick.bind(this));
  }

  /**
   * Handles the logic when a hex tile is clicked.
   * @param {import('./HexTile.js').default} tile The tile that was clicked.
   * @private
   */
  _handleHexClick(tile) {
    // Rule: You can only build on empty land tiles (not ocean or mountain).
    if (!tile.contentType && tile.biomeType !== 'ocean' && tile.biomeType !== 'mountain') {
      tile.contentType = this.player.currentTileInHand;
      console.log(`Placed '${this.player.currentTileInHand}' on tile (${tile.x}, ${tile.y})`);
    }
  }
}