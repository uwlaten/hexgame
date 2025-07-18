/**
 * @fileoverview Defines the main Game class, which orchestrates game logic.
 */

import { Building } from './Building.js';
import PlacementResolver from './PlacementResolver.js';
import HexGridUtils from './HexGridUtils.js';
import { BuildingDefinitionMap } from './BuildingLibrary.js';
import MapGenerator from './MapGenerator.js';
import { Resource } from './Resource.js';
/**
 * Manages the overall game state, player actions, and game rules.
 * It listens for events and updates the game world accordingly.
 */
export default class Game {
  /**
   * Creates an instance of the Game.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Player.js').default} player The player instance.
   * @param {import('./Map.js').default} map The game map.
   * @param {import('./Renderer.js').default} renderer The game renderer.
   * @param {import('./UIManager.js').default} uiManager The UI manager.
   */
  constructor(eventEmitter, player, map, renderer, uiManager) {
    this.eventEmitter = eventEmitter;
    this.player = player;
    this.map = map;
    this.renderer = renderer;
    this.uiManager = uiManager;
  }

  /**
   * Initializes the game by setting up event listeners.
   */
  init() {
    this.eventEmitter.on('HEX_CLICKED', this._handleHexClick.bind(this));
    this.eventEmitter.on('NEW_GAME_REQUESTED', this.reset.bind(this));

    // Provide the UIManager with access to the game state for previews.
    this.uiManager.setContext(this.player, this.map);
    // Manually trigger the first preview update now that the context is set.
    this.uiManager.updateTilePreviews();
    this.uiManager.updateTileCounter();
  }

  /**
   * Resets the game to a new state.
   */
  reset() {
    this.player.reset();
    this.renderer.clearOutlines();
    const options = this.uiManager.getGenerationOptions();
    const generationLog = MapGenerator.generate(this.map, options);

    // Print the generation log for the new map.
    console.groupCollapsed('New Map Generation Log');
    for (const message of generationLog) {
      console.log(message);
    }
    console.groupEnd();

    // Resize the canvas to fit the new map dimensions.
    const dimensions = this.renderer.getRequiredCanvasDimensions(this.map);
    this.renderer.canvas.width = dimensions.width;
    this.renderer.canvas.height = dimensions.height;

    this.eventEmitter.emit('MAP_STATE_CHANGED');
  }

  /**
   * Handles the logic when a hex tile is clicked.
   * @param {import('./HexTile.js').default} tile The tile that was clicked.
   * @private
   */
  _handleHexClick(tile) {
    const baseBuildingId = this.player.currentTileInHand;
    if (!baseBuildingId) return; // Player has no building to place.

    // Use the PlacementResolver to determine the outcome of the placement.
    const result = PlacementResolver.resolvePlacement(baseBuildingId, tile, this.map, this.player);

    if (result.isValid) {
      // Create a new Building instance based on the *resolved* type.
      const newBuilding = new Building(result.resolvedBuildingId);
      tile.setContent(newBuilding);

      // Log the placement and score breakdown
      console.groupCollapsed(`Placed '${result.resolvedBuildingId}' on tile (${tile.x}, ${tile.y}) with a score of ${result.score.total}`);
      for (const component of result.score.breakdown) {
        console.log(`${component.rule}: ${component.reason} (+${component.points})`);
      }
      console.groupEnd();

      // console.log(`Placed '${result.resolvedBuildingId}' on tile (${tile.x}, ${tile.y}) with a score of ${result.score}`);

      // Handle resource claiming if the new building is a resource extractor.
      this._handleResourceClaim(newBuilding, tile);

      // Announce that a building has been placed for other systems to react to.
      this.eventEmitter.emit('BUILDING_PLACED', tile, result.appliedTransformations);

      // If the City Centre was just placed, update the player state.
      if (baseBuildingId === 'CityCentre') {
        this.player.cityCentrePlaced = true;
      }

      // After placing, the player draws a new tile.
      this.player.drawNewTile();


      // Immediately update the tooltip on the placed tile
      // Simulate a "hover" event on the *same* tile. This will trigger the UI to
      // refresh the tooltip with the building now present.  We pass in a null


      // event to indicate this isn't a real mouse movement.
      this.eventEmitter.emit('HEX_HOVERED', { tile, event: null });
    }
  }


  

  /**
   * Checks if a newly placed building claims a resource and updates the resource's state.
   * @param {Building} building The building instance that was just placed.
   * @param {import('./HexTile.js').default} tile The tile the building was placed on.
   * @private
   */
  _handleResourceClaim(building, tile) {
    const buildingDef = BuildingDefinitionMap.get(building.type);
    const resourceToClaim = buildingDef?.claimsResource;

    if (!resourceToClaim) return;

    const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
    for (const coord of neighbors) {
      const neighborTile = this.map.getTileAt(coord.x, coord.y);
      if (neighborTile?.contentType instanceof Resource &&
          neighborTile.contentType.type === resourceToClaim &&
          !neighborTile.contentType.isClaimed) {
        // Set the resource as claimed to prevent others from taking it.
        neighborTile.contentType.isClaimed = true;
        // Create the explicit, two-way data link between the building and the resource.
        building.claimedResourceTile = neighborTile;
        neighborTile.contentType.claimedBy = building;

        // Add the pair of tiles (Industry and Resource) to the renderer's outline list.
        this.renderer.addOutlinedGroup([tile, neighborTile]);

        console.log(`Resource '${resourceToClaim}' at (${neighborTile.x}, ${neighborTile.y}) was claimed by '${building.type}'.`);
        break; // A building only claims one resource.
      }
    }
  }
}