/**
 * @fileoverview Defines the data for all building types in the game.
 * This provides a single source of truth for building properties.
 * It includes base buildings that the player can place, and transformed
 * buildings that result from specific placement contexts.
 */

export const BuildingLibrary = {
  // =================================================================================
  // == BASE BUILDINGS (PLAYER HAND)
  // =================================================================================
  CITY_CENTRE: {
    id: 'CityCentre',
    name: 'City Centre',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#D4AF37', params: [ [-0.4, -0.2], [0.4, -0.2], [0.4, 0.2], [0, 0.4], [-0.4, 0.2] ] },
        { type: 'polygon', fillStyle: '#FFD700', params: [ [-0.3, -0.1], [0.3, -0.1], [0.3, 0.15], [0, 0.3], [-0.3, 0.15] ] },
      ],
    },
  },
  INDUSTRY: {
    id: 'Industry',
    name: 'Industry',
    transformModel: 'exclusive', // Chooses the single best transformation.
    transformations: [
      {
        id: 'IronMine',
        conditions: [{ type: 'adjacentToResource', id: 'Iron', claimed: false }],
      },
      {
        id: 'Quarry',
        conditions: [{ type: 'adjacentToResource', id: 'Stone', claimed: false }],
      },
      {
        id: 'Mine',
        conditions: [{ type: 'feature', id: 'hills' }],
      },
    ],
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'rect', fillStyle: '#696969', params: [-0.1, -0.5, 0.2, 0.2] },
      ],
    },
  },
  RESIDENCE: {
    id: 'Residence',
    name: 'Residence',
    transformModel: 'additive', // Combines all applicable positive bonuses.
    additiveResultId: 'LuxuryHome', // If more than one bonus is met, it becomes this.
    transformations: [
      // Negative transformations are checked first and override positives.
      {
        id: 'PollutedSlum',
        isNegative: true,
        conditions: [{ type: 'adjacentToBuilding', id: 'Mine' }],
      },
      // Positive bonuses.
      {
        id: 'HilltopVilla',
        conditions: [{ type: 'feature', id: 'hills' }],
      },
      {
        id: 'RiverfrontHome',
        conditions: [{ type: 'adjacentToRiver' }],
      },
    ],
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#006400', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#FFFFFF', params: [-0.15, 0, 0.1, 0.2] },
      ],
    },
  },
  ROAD: {
    id: 'Road',
    name: 'Road',
    transformations: [
      {
        id: 'Bridge',
        conditions: [
          { type: 'onBiome', id: ['ocean', 'lake'] },
          { type: 'neighbor', property: 'biome.isBuildable', value: true, operator: 'exactly', count: 2 },
        ],
      },
    ],
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#696969', params: [-0.1, -0.5, 0.2, 1] },
        { type: 'rect', fillStyle: '#696969', params: [-0.5, -0.1, 1, 0.2] },
      ],
    },
  },

  // =================================================================================
  // == TRANSFORMED BUILDINGS (MAP ONLY)
  // =================================================================================

  // --- Industry Transformations ---
  MINE: {
    id: 'Mine',
    name: 'Mine',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'polygon', fillStyle: '#404040', params: [ [-0.2, -0.1], [0.2, -0.1], [0, 0.2] ] },
      ],
    },
  },
  IRON_MINE: {
    id: 'IronMine',
    name: 'Iron Mine',
    baseId: 'Industry',
    claimsResource: 'Iron',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'polygon', fillStyle: '#5E6971', params: [ [-0.2, -0.1], [0.2, -0.1], [0.25, 0.05], [0.1, 0.2], [-0.1, 0.2], [-0.25, 0.05] ] },
      ],
    },
  },
  QUARRY: {
    id: 'Quarry',
    name: 'Quarry',
    baseId: 'Industry',
    claimsResource: 'Stone',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'polygon', fillStyle: '#808080', params: [ [-0.3, -0.1], [0, -0.2], [0.3, -0.1], [0.3, 0.2], [-0.3, 0.2] ] },
      ],
    },
  },

  // --- Residence Transformations ---
  POLLUTED_SLUM: {
    id: 'PollutedSlum',
    name: 'Polluted Slum',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#556B2F', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#A9A9A9', params: [-0.15, 0, 0.1, 0.2] },
      ],
    },
  },
  HILLTOP_VILLA: {
    id: 'HilltopVilla',
    name: 'Hilltop Villa',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#CD853F', params: [ [-0.3, 0.4], [0.3, 0.4], [0.4, -0.1], [-0.4, -0.1] ] },
        { type: 'rect', fillStyle: '#F5DEB3', params: [-0.2, 0, 0.4, 0.2] },
      ],
    },
  },
  RIVERFRONT_HOME: {
    id: 'RiverfrontHome',
    name: 'Riverfront Home',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#4682B4', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'circle', fillStyle: '#ADD8E6', params: [0, 0.1, 0.15] },
      ],
    },
  },
  LUXURY_HOME: {
    id: 'LuxuryHome',
    name: 'Luxury Home',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#800080', params: [ [-0.4, 0.4], [0.4, 0.4], [0.4, -0.2], [0, -0.5], [-0.4, -0.2] ] },
        { type: 'polygon', fillStyle: '#DA70D6', params: [ [-0.3, 0.3], [0.3, 0.3], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
      ],
    },
  },

  // --- Road Transformations ---
  BRIDGE: {
    id: 'Bridge',
    name: 'Bridge',
    baseId: 'Road',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#D2B48C', params: [-0.5, -0.1, 1, 0.2] },
        { type: 'rect', fillStyle: '#8B4513', params: [-0.5, -0.15, 0.1, 0.3] },
        { type: 'rect', fillStyle: '#8B4513', params: [0.4, -0.15, 0.1, 0.3] },
      ],
    },
  },
};

// Create a lookup map with the building ID as the key.
export const BuildingDefinitionMap = new Map(
  Object.values(BuildingLibrary).map(building => [building.id, building])
);