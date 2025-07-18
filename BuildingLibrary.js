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
    // each transformation needs a 'reason'. Optionally a 'score' to override the default.
    // To override the score for claiming a resource, provide 'claimScore'.
    transformations: [
      // --- Mining Group (most specific first) ---
      {
        id: 'GoldMine',
        conditions: [{ type: 'adjacentToResource', id: 'Gold', claimed: false }],
        reason: 'Built a Gold Mine',
        claimReason: 'Claimed nearby Gold deposit',
      },
      {
        id: 'IronMine',
        conditions: [{ type: 'adjacentToResource', id: 'Iron', claimed: false }],
        reason: 'Built an Iron Mine',
        claimReason: 'Claimed nearby Iron deposit',
      },
      {
        id: 'Quarry',
        conditions: [{ type: 'adjacentToResource', id: 'Stone', claimed: false }],
        reason: 'Built a quarry',
        claimReason: 'Claimed nearby Stone',
      },
      {
        id: 'Stonecutter',
        conditions: [{ type: 'adjacentToBiome', id: 'mountain' }], //multiple equivalent options decided based on priority - higher on the list = first
        reason: 'Built a stonecutter',
      },
      {
        id: 'Mine',
        conditions: [{ type: 'feature', id: 'hills' }],
        reason: 'Built a mine',
      },
      // --- Forestry Group ---
      {
        id: 'Lumbermill',
        conditions: [
          { type: 'feature', id: 'forest' },
          { type: 'adjacentToResource', id: 'Wood', claimed: false },
        ],
        reason: 'Built a Lumbermill',
        claimReason: 'Claimed nearby Wood',
      },
      {
        id: 'Woodcutter',
        conditions: [{ type: 'feature', id: 'forest' }],
        reason: 'Built a woodcutter',
      },
      // --- Farming Group ---
      {
        id: 'Farm',
        conditions: [
          { type: 'adjacentToResource', id: 'Grain', claimed: false },
          { type: 'onBiome', id: 'plains' },
          { type: 'adjacentToRiver' }, // might want to relax this to just grain and plains
        ],
        reason: 'Built a Farm',
        claimReason: 'Claimed nearby Grain',
      },
      {
        id: 'Croft',
        conditions: [
          { type: 'onBiome', id: 'plains'  },
          { type: 'adjacentToRiver'},
        ],
        reason: 'Built a croft',
      },
      // --- Fishing Group ---
      {
        id: 'Fishery',
        conditions: [{ type: 'adjacentToResource', id: 'Fish', claimed: false }],
        reason: 'Built a Fishery',
        claimReason: 'Claimed nearby Fish',
      },
      {
        id: 'FishingHut',
        conditions: [{ type: 'adjacentToBiome', id: ['ocean', 'lake']}],
        reason: 'Built a fishing hut',
      },
      // --- Herding Group ---
      {
        id: 'CattleFarm',
        conditions: [{ type: 'adjacentToResource', id: 'Cattle', claimed: false }],
        reason: 'Built a Cattle Farm',
        claimReason: 'Claimed nearby Cattle',
      },
      {
        id: 'HerdersHut',
        conditions: [{ type: 'onBiome', id: 'steppe'}],
        reason: 'Built a herder\'s hut',
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
        conditions: [{ type: 'adjacentToBuilding', id: ['Mine', 'IronMine', 'GoldMine'] }],
        reason: 'Built next to a mine',
      },
      {
        id: 'NoisyHomes',
        isNegative: true,
        conditions: [{ type: 'adjacentToBuilding', id: ['Quarry', 'Lumbermill'] }],
        reason: 'Built next to a noisy neighbour',
      },
      {
        id: 'AridAbodes',
        isNegative: true,
        conditions: [
          { type: 'onBiome', id: 'desert' },
          { type: 'adjacentToFeature', id: 'oasis', invert: true},//and not adjacent to oasis
        ], 
        reason: 'Built far from water',
      },
      {
        id: 'FrigidHamlet',
        isNegative: true,
        conditions: [{ type: 'onBiome', id: 'tundra' }],
        reason: 'Built in the wasteland',
      },
      {
        id: 'WildernessHuts',
        isNegative: true,
        conditions: [{ type: 'feature', id: 'forest' }],
        reason: 'Built on uncleared land',
      },
      // Positive bonuses.
      {
        id: 'HilltopVilla',
        conditions: [{ type: 'feature', id: 'hills' }],
        reason: 'Built with beautiful views',
      },
      {
        id: 'RiversideHome',
        conditions: [{ type: 'adjacentToRiver' }],
        reason: 'Built on the riverbank',
      },
      {
        id: 'DesertHub',
        conditions: [{ type: 'adjacentToFeature', id: 'oasis' }],
        reason: 'Built by the oasis',
      },
      {
        id: 'SeafrontHomes',
        conditions: [{ type: 'adjacentToBiome', id: 'ocean' }],
        reason: 'Built on the coast',
      },    
      {
        id: 'LakeLodges',
        conditions: [{ type: 'adjacentToBiome', id: 'lake' }],
        reason: 'Built on the lakeside',
      },   
      {
        id: 'WoodlandRetreat',
        conditions: [{ type: 'adjacentToFeature', id: 'forest' }],
        reason: 'Built near the woods',
       },
      {
        id: 'MountainViews',
        conditions: [{ type: 'adjacentToBiome', id: 'mountain' }],
        reason: 'Built near spectacular views',
      },   
      {
        id: 'Farmstead',
        conditions: [{ type: 'adjacentToBuilding', id: ['Croft', 'Farm'] }],
        reason: 'Built homes for the farmers',
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
    buildableBiomeExceptions: ['ocean', 'lake'],
    transformations: [
      {
        id: 'Bridge',
        name: 'Bridge',
        conditions: [
          { type: 'onBiome', id: ['ocean', 'lake'] },
          { type: 'neighbor', property: 'biome.isBuildable', value: true, operator: 'atLeast', count: 2 },
        ],
        reason: 'Built across water',
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
  GOLD_MINE: {
    id: 'GoldMine',
    name: 'Gold Mine',
    baseId: 'Industry',
    claimsResource: 'Gold',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'polygon', fillStyle: '#FFD700', params: [ [-0.2, -0.1], [0.2, -0.1], [0.25, 0.05], [0.1, 0.2], [-0.1, 0.2], [-0.25, 0.05] ] },
      ],
    },
  },
  STONECUTTER: {
    id: 'Stonecutter',
    name: 'Stonecutter',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'rect', fillStyle: '#808080', params: [ -0.25, -0.1, 0.1, 0.4 ] }, // Chisel handle
        { type: 'polygon', fillStyle: '#C0C0C0', params: [ [-0.3, -0.1], [-0.2, -0.2], [-0.1, -0.1] ] }, // Chisel head
      ],
    },
  },
  WOODCUTTER: {
    id: 'Woodcutter',
    name: 'Woodcutter',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'polygon', fillStyle: '#8B4513', params: [ [-0.2, 0.2], [-0.1, 0.3], [0.3, -0.1], [0.2, -0.2] ] }, // Axe handle
        { type: 'polygon', fillStyle: '#C0C0C0', params: [ [-0.3, 0.1], [-0.2, 0.2], [-0.1, 0.1], [-0.2, 0.0] ] }, // Axe head
      ],
    },
  },
  LUMBERMILL: {
    id: 'Lumbermill',
    name: 'Lumbermill',
    baseId: 'Industry',
    claimsResource: 'Wood',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.3], [0.3, -0.3], [0.4, 0.3], [-0.4, 0.3] ] },
        { type: 'circle', fillStyle: '#C0C0C0', strokeStyle: '#696969', lineWidth: 1, params: [0, 0, 0.2] }, // Saw blade
      ],
    },
  },
  CROFT: {
    id: 'Croft',
    name: 'Croft',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#DEB887', params: [-0.3, -0.2, 0.6, 0.4] }, // Building base
        { type: 'polygon', fillStyle: '#A0522D', params: [ [-0.35, -0.2], [0.35, -0.2], [0, -0.4] ] }, // Roof
      ],
    },
  },
  FARM: {
    id: 'Farm',
    name: 'Farm',
    baseId: 'Industry',
    claimsResource: 'Grain',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#DEB887', params: [-0.4, -0.2, 0.8, 0.5] }, // Larger building base
        { type: 'polygon', fillStyle: '#A0522D', params: [ [-0.45, -0.2], [0.45, -0.2], [0, -0.5] ] }, // Larger roof
      ],
    },
  },
  FISHING_HUT: {
    id: 'FishingHut',
    name: 'Fishing Hut',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#D2B48C', params: [ [-0.3, 0.2], [0.3, 0.2], [0, -0.2] ] }, // Simple hut
        { type: 'polygon', fillStyle: '#4682B4', params: [ [-0.1, -0.3], [0.1, -0.3], [0, -0.4] ] }, // Fish icon
      ],
    },
  },
  FISHERY: {
    id: 'Fishery',
    name: 'Fishery',
    baseId: 'Industry',
    claimsResource: 'Fish',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#B0C4DE', params: [-0.4, -0.2, 0.8, 0.4] }, // Building base
        { type: 'circle', strokeStyle: '#FFFFFF', lineWidth: 1, params: [0, 0, 0.25] }, // Net
      ],
    },
  },
  HERDERS_HUT: {
    id: 'HerdersHut',
    name: 'Herders Hut',
    baseId: 'Industry',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'circle', fillStyle: '#684505ff', params: [0, 0, 0.3] }, // Yurt shape
        { type: 'polygon', fillStyle: '#DAA520', params: [ [-0.3, 0], [0.3, 0], [0, -0.3] ] }, // Conical roof
      ],
    },
  },
  CATTLE_FARM: {
    id: 'CattleFarm',
    name: 'Cattle Farm',
    baseId: 'Industry',
    claimsResource: 'Cattle',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#FFFFFF', params: [-0.3, -0.2, 0.6, 0.4] }, // White barn
        { type: 'rect', fillStyle: '#000000', params: [-0.2, -0.1, 0.1, 0.1] }, // Black spot
        { type: 'rect', fillStyle: '#000000', params: [0.1, 0.0, 0.15, 0.1] }, // Black spot
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
  NOISY_HOMES: {
    id: 'NoisyHomes',
    name: 'Noisy Homes',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#696969', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#A9A9A9', params: [-0.15, 0, 0.1, 0.2] },
        // Sound waves
        { type: 'arc', strokeStyle: '#FFFFFF', lineWidth: 1, params: [0, 0, 0.2, -0.5, 0.5] },
        { type: 'arc', strokeStyle: '#FFFFFF', lineWidth: 1, params: [0, 0, 0.3, -0.5, 0.5] },
      ],
    },
  },
  ARID_ABODES: {
    id: 'AridAbodes',
    name: 'Arid Abodes',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // A log-cabin style house
        { type: 'polygon', fillStyle: '#8B4513', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1],  [0, -0.4], [-0.3, -0.1] ] },
        // A brown roof to represent the forest
        { type: 'polygon', fillStyle: '#f5d185ff', params: [ [-0.4, -0.1],  [0.4, -0.1], [0, -0.5] ] },
      ],
    },
  },
  FRIGID_HAMLET: {
    id: 'FrigidHamlet',
    name: 'Frigid Hamlet',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#B0E0E6', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'polygon', fillStyle: '#FFFFFF', params: [ [-0.35, -0.1], [0.35, -0.1], [0, -0.5] ] }, // Snow on roof
      ],
    },
  },
  WILDERNESS_HUTS: {
    id: 'WildernessHuts',
    name: 'Wilderness Huts',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#8B4513', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#A0522D', params: [-0.15, 0, 0.1, 0.2] },
      ],
    },
  },
  FARMSTEAD: {
    id: 'Farmstead',
    name: 'Farmstead',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // A simple, clean farmhouse
        { type: 'polygon', fillStyle: '#F5DEB3', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#A0522D', params: [-0.1, 0.1, 0.2, 0.2] }, // Door
        { type: 'polygon', fillStyle: '#8B0000', params: [ [-0.35, -0.1], [0.35, -0.1], [0, -0.5] ] }, // Red roof
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
  RIVERSIDE_HOME: {
    id: 'RiversideHome',
    name: 'Riverside Home',
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
  WOODLAND_RETREAT: {
    id: 'WoodlandRetreat',
    name: 'Woodland Retreat',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // A log-cabin style house
        { type: 'polygon', fillStyle: '#8B4513', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1],  [0, -0.4], [-0.3, -0.1] ] },
        // A green roof to represent the forest
        { type: 'polygon', fillStyle: '#228B22', params: [ [-0.4, -0.1],  [0.4, -0.1], [0, -0.5] ] },
      ],
    },
  },

  DESERT_HUB: {
    id: 'DesertHub',
    name: 'Desert Hub',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // Sandy-colored adobe house
        { type: 'polygon', fillStyle: '#d2b48c', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        // A simple door
        { type: 'rect', fillStyle: '#8B4513', params: [-0.1, 0.1, 0.2, 0.3] },
      ],
    },
  },

  SEAFRONT_HOMES: {
    id: 'SeafrontHomes',
    name: 'Seafront Homes',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // White house with a blue roof
        { type: 'polygon', fillStyle: '#F0F8FF', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'polygon', fillStyle: '#4682B4', params: [ [-0.4, -0.1], [0.4, -0.1], [0, -0.5] ] },
      ],
    },
  },

  LAKE_LODGES: {
    id: 'LakeLodges',
    name: 'Lake Lodges',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // Log cabin style
        { type: 'polygon', fillStyle: '#8B4513', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        { type: 'rect', fillStyle: '#D2B48C', params: [-0.15, 0, 0.1, 0.2] },
        { type: 'rect', fillStyle: '#D2B48C', params: [0.05, 0, 0.1, 0.2] },
      ],
    },
  },

  MOUNTAIN_VIEWS: {
    id: 'MountainViews',
    name: 'Mountain Views',
    baseId: 'Residence',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // Stone-colored house
        { type: 'polygon', fillStyle: '#B0C4DE', params: [ [-0.3, 0.4], [0.3, 0.4], [0.3, -0.1], [0, -0.4], [-0.3, -0.1] ] },
        // A small mountain peak icon on the roof
        { type: 'polygon', fillStyle: '#FFFFFF', strokeStyle: '#696969', lineWidth: 1, params: [ [-0.2, -0.2], [0, -0.5], [0.2, -0.2] ] },
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