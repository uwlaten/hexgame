/**
 * @fileoverview Defines the data for all resource types in the game.
 * This provides a single source of truth for resource properties.
 *
 * Each resource can have the following optional reward properties:
 * - uniqueTileReward: The ID of a specific, unique building tile to grant when this resource is claimed.
 * - rewardBundle: The key of a reward bundle defined in Config.js to use for granting random tiles.
 *   If omitted, the 'default' bundle will be used.
 */

export const ResourceLibrary = {
  IRON: {
    id: 'Iron',
    name: 'Iron',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        { type: 'polygon', fillStyle: '#5E6971', params: [ [-0.3, -0.1], [0.3, -0.1], [0.35, 0.1], [0.2, 0.3], [-0.2, 0.3], [-0.35, 0.1] ] },
      ],
    },
    uniqueTileReward: 'Forge',
    rewardBundle: 'IndustryBundle',
  },
  FISH: {
    id: 'Fish',
    name: 'Fish',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        { type: 'polygon', fillStyle: '#4682B4', params: [ [-0.4, 0], [0, -0.2], [0.2, 0], [0, 0.2] ] },
        { type: 'polygon', fillStyle: '#4682B4', params: [ [0.2, 0], [0.4, -0.2], [0.4, 0.2] ] },
      ],
    },
    uniqueTileReward: 'Smokehouse',
    rewardBundle: 'ResidentialBundle',
  },
  GRAIN: {
    id: 'Grain',
    name: 'Grain',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      fillStyle: '#ce980fff', // A darker, more golden color for the wheat.
      strokeStyle: '#ce980fff', // A dark brown for the outline.
      lineWidth: 1.5, // A slightly thicker line.
      shapes: [
        // Background plate (overrides the default styles for the wheat).
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', strokeStyle: 'transparent', params: [0, 0, 0.45] },
        // A single, stylized stalk of wheat, which will use the default styles.
        // Stem
        { type: 'rect', params: [-0.04, 0.0, 0.08, 0.4] },
        // Kernels (staggered on both sides)
        { type: 'polygon', params: [ [-0.04, 0.05], [-0.15, -0.05], [-0.04, -0.15] ] },
        { type: 'polygon', params: [ [0.04, 0.05], [0.15, -0.05], [0.04, -0.15] ] },
        { type: 'polygon', params: [ [-0.04, -0.1], [-0.15, -0.2], [-0.04, -0.3] ] },
        { type: 'polygon', params: [ [0.04, -0.1], [0.15, -0.2], [0.04, -0.3] ] },
        // Top of the stalk
        { type: 'polygon', params: [ [-0.04, -0.25], [0, -0.4], [0.04, -0.25] ] },
      ],
    },
    uniqueTileReward: 'Bakery',
    rewardBundle: 'ResidentialBundle',
  },
  WOOD: {
    id: 'Wood',
    name: 'Wood',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        { type: 'rect', fillStyle: '#8B4513', params: [-0.4, -0.1, 0.8, 0.2] },
        { type: 'rect', fillStyle: '#A0522D', params: [-0.3, 0.1, 0.7, 0.2] },
      ],
    },
    uniqueTileReward: 'Sawmill',
    rewardBundle: 'IndustryBundle',
  },
  STONE: {
    id: 'Stone',
    name: 'Stone',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.1], [0, -0.3], [0.2, 0], [-0.1, 0.2] ] },
        { type: 'polygon', fillStyle: '#808080', params: [ [0.1, 0.1], [0.4, 0.2], [0.2, 0.4] ] },
      ],
    },
    uniqueTileReward: 'Mason',
    rewardBundle: 'IndustryBundle',
  },
  GOLD: {
    id: 'Gold',
    name: 'Gold',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        // A simple trapezoid to represent a gold ingot.
        { type: 'polygon', fillStyle: '#FFD700', strokeStyle: '#DAA520', lineWidth: 1, params: [ [-0.25, -0.2], [0.25, -0.2], [0.2, 0.2], [-0.2, 0.2] ] },
      ],
    },
    uniqueTileReward: 'Mint',
    rewardBundle: 'IndustryBundle',
  },
  CATTLE: {
    id: 'Cattle',
    name: 'Cattle',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: 'rgba(255, 255, 255, 0.8)', params: [0, 0, 0.45] },
        // A simple milk bottle shape.
        { type: 'rect', fillStyle: '#F5F5F5', strokeStyle: '#BDBDBD', lineWidth: 1, params: [-0.15, -0.2, 0.3, 0.45] }, // Body of the bottle
        { type: 'rect', fillStyle: '#E0E0E0', strokeStyle: '#BDBDBD', lineWidth: 1, params: [-0.15, -0.3, 0.3, 0.1] },  // Top/cap area
      ],
    },
    uniqueTileReward: 'Tannery',
    rewardBundle: 'ResidentialBundle',
  },
};