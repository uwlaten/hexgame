/**
 * @fileoverview Defines the main Game class, which orchestrates game logic.
 */

import { Building } from './Building.js';
import PlacementResolver from './PlacementResolver.js';
import HexGridUtils from './HexGridUtils.js';
import { BuildingDefinitionMap } from './BuildingLibrary.js';
import { ResourceLibrary } from './ResourceLibrary.js';
import Config from './Config.js';
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
    this.uiManager.setContext(this.player, this.map, this.renderer);
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

    // After any potential state change, notify the renderer.
    this.eventEmitter.emit('MAP_STATE_CHANGED');
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

        // Get the full resource definition to process its reward.
        const resourceDef = ResourceLibrary[resourceToClaim.toUpperCase()];
        if (resourceDef) {
          this._processTileReward(resourceDef);
        }

        break; // A building only claims one resource.
      }
    }
  }

  /**
   * Processes the tile reward for claiming a specific resource.
   * @param {object} resourceDef The definition of the claimed resource from ResourceLibrary.
   * @private
   */
  _processTileReward(resourceDef) {
    const tilesToAward = [];
    const notificationMessages = [];

    // 1. Process unique tile reward
    if (resourceDef.uniqueTileReward) {
      tilesToAward.push(resourceDef.uniqueTileReward);
      const tileDef = BuildingDefinitionMap.get(resourceDef.uniqueTileReward);
      notificationMessages.push(`+1 ${tileDef?.name || resourceDef.uniqueTileReward}`);
    }

    // 2. Process bundle reward
    const bundleKey = resourceDef.rewardBundle || 'default';
    const bundle = Config.RewardConfig.bundles[bundleKey];

    if (bundle && bundle.count > 0) {
      notificationMessages.push(bundle.message);
      for (let i = 0; i < bundle.count; i++) {
        const tileId = this._getWeightedRandomTile(bundle.pool);
        if (tileId) {
          tilesToAward.push(tileId);
        }
      }
    }

    // 3. Finalize and award tiles
    if (tilesToAward.length > 0) {
      this.player.addTilesToDeck(tilesToAward);
      const finalMessage = `Claimed ${resourceDef.name}! ${notificationMessages.join(' & ')}`;
      this.eventEmitter.emit('TILES_AWARDED', finalMessage);
    }
  }

  /**
   * Selects a random tile ID from a weighted pool.
   * @param {Array<{id: string, weight: number}>} pool The pool of possible tiles.
   * @returns {string|null} The ID of the selected tile, or null if the pool is empty.
   * @private
   */
  _getWeightedRandomTile(pool) {
    if (!pool || pool.length === 0) return null;

    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return pool[0].id; // Fallback

    let random = Math.random() * totalWeight;

    for (const item of pool) {
      if (random < item.weight) {
        return item.id;
      }
      random -= item.weight;
    }

    return pool[pool.length - 1].id; // Fallback for floating point inaccuracies
  }
}