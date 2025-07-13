/**
 * @fileoverview Defines the data for all biome types in the game.
 * This provides a single source of truth for biome properties.
 */

export const BiomeLibrary = {
  OCEAN: {
    id: 'ocean',
    name: 'Ocean',
    color: '#4f93a8',
    isBuildable: false,
    canSupportFeatures: false,
  },
  LAKE: {
    id: 'lake',
    name: 'Lake',
    color: '#63b4cf',
    isBuildable: false,
    canSupportFeatures: false,
  },
  ICE: {
    id: 'ice',
    name: 'Ice',
    color: '#ffffff',
    isBuildable: false,
    canSupportFeatures: false,
  },
  MOUNTAIN: {
    id: 'mountain',
    name: 'Mountain',
    color: '#808080',
    isBuildable: false,
    canSupportFeatures: false,
    draw: {
      type: 'shapes',
      strokeStyle: '#ffffffff', // LightGray for the peak symbols
      lineWidth: 2,
      shapes: [
        // A set of 3 chevrons (^) to represent mountain peaks.
        // Each is a 3-point polygon that will be stroked, not filled.
        { type: 'polygon', params: [ [-5, 2], [0, -6], [5, 2] ] },   // Center
        { type: 'polygon', params: [ [-12, 7], [-8, 0], [-4, 7] ] }, // Left
        { type: 'polygon', params: [ [4, 7], [8, 0], [12, 7] ] },  // Right
      ],
    },
  },
  DESERT: {
    id: 'desert',
    name: 'Desert',
    color: '#d2b48c',
    isBuildable: true,
    climate: {
      temperature: ['hot', 'temperate'],
      moisture: ['dry'],
    },
    canSupportFeatures: true,
  },
  GRASSLAND: {
    id: 'grassland',
    name: 'Grassland',
    color: '#98fb98',
    isBuildable: true,
    climate: {
      temperature: ['cold', 'temperate'],
      moisture: ['normal', 'wet'],
    },
    canSupportFeatures: true,
  },
  SAVANNAH: {
    id: 'savannah',
    name: 'Savannah',
    color: '#f0e68c',
    isBuildable: true,
    climate: {
      temperature: ['temperate', 'hot'],
      moisture: ['dry', 'normal'],
    },
    canSupportFeatures: true,
    isDefaultPlaceholder: true, // This is the default land biome before climate is applied.
  },
  TUNDRA: {
    id: 'tundra',
    name: 'Tundra',
    color: '#c4d3e3', // A slightly darker, less pure white than ice
    isBuildable: true,
    climate: {
      temperature: ['cold'],
      moisture: ['dry', 'normal', 'wet'], // Tundra can be boggy or dry
    },
    canSupportFeatures: true,
  },
};

/**
 * A list of all biome IDs, useful for random generation.
 * @type {string[]}
 */
export const BiomeIdList = Object.values(BiomeLibrary).map(biome => biome.id);

/**
 * A map of biome IDs to their color, useful for the renderer.
 * @type {Object.<string, string>}
 */
export const BiomeColors = Object.fromEntries(
  Object.values(BiomeLibrary).map(biome => [biome.id, biome.color])
);