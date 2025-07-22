/**
 * @fileoverview Defines the RewardManager class for handling resource claim rewards.
 */

import Config from './Config.js';
import { BuildingDefinitionMap } from './BuildingLibrary.js';

/**
 * Manages the logic for awarding new tiles to the player when they claim resources.
 */
export default class RewardManager {
  /**
   * Creates an instance of the RewardManager.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Player.js').default} player The player instance.
   * @param {import('./Map.js').default} map The game map.
   */
  constructor(eventEmitter, player, map) {
    this.eventEmitter = eventEmitter;
    this.player = player;
    this.map = map;
  }

  /**
   * Initializes the manager by setting up event listeners.
   */
  init() {
    this.eventEmitter.on('RESOURCE_CLAIMED', this._processTileReward.bind(this));
  }

  /**
   * Processes the tile reward for claiming a specific resource.
   * This method will be moved from Game.js.
   * @param {object} resourceDef The definition of the claimed resource from ResourceLibrary.
   * @private
   */
  _processTileReward(resourceDef) {
    const tilesToAward = [];
    const notificationMessages = [];

    // 1. Process unique tile reward
    if (Config.RewardConfig.enableUniqueTileRewards && resourceDef.uniqueTileReward) {
      tilesToAward.push(resourceDef.uniqueTileReward);
      const tileDef = BuildingDefinitionMap.get(resourceDef.uniqueTileReward);
      notificationMessages.push(`+1 ${tileDef?.name || resourceDef.uniqueTileReward}`);
    }

    // 2. Process bundle reward
    const bundleKey = resourceDef.rewardBundle || 'default';
    const bundle = Config.RewardConfig.bundles[bundleKey];

    if (bundle) {
      // Calculate the scaled number of tiles to award from the bundle.
      const { baseMapArea } = Config.RewardConfig;
      const actualMapArea = this.map.width * this.map.height;
      const scalingFactor = actualMapArea / baseMapArea;

      const { baseCount, min, max } = bundle.count;
      const scaledCount = Math.round(baseCount * scalingFactor);
      const finalCount = Math.max(min, Math.min(scaledCount, max));

      if (finalCount > 0) {
        // Format the message with the calculated count.
        const message = bundle.message.replace('{count}', finalCount);
        notificationMessages.push(message);

        for (let i = 0; i < finalCount; i++) {
          const tileId = this._getWeightedRandomTile(bundle.pool);
          if (tileId) tilesToAward.push(tileId);
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