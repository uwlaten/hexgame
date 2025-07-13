/**
 * @fileoverview Defines the main Game class, which orchestrates game logic.
 */

import { Building } from './Building.js';
import PlacementRules from './PlacementRules.js';
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
    const buildingTypeToPlace = this.player.currentTileInHand;

    // Delegate rule checking to the expert module.
    if (PlacementRules.canPlaceBuilding(tile, buildingTypeToPlace, this.player)) {
      // Create a new Building instance based on what's in the player's hand.
      const newBuilding = new Building(buildingTypeToPlace);
      tile.setContent(newBuilding);
      console.log(`Placed '${buildingTypeToPlace}' on tile (${tile.x}, ${tile.y})`);

      // Announce that a building has been placed for other systems to react to.
      this.eventEmitter.emit('BUILDING_PLACED', tile);

      // After placing, the player draws a new tile.
      this.player.drawNewTile();
    }
  }
}