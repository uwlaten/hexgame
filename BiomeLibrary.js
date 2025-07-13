/**
 * @fileoverview Defines the data for all biome types in the game.
 * This provides a single source of truth for biome properties.
 */

export const BiomeLibrary = {
  OCEAN: { id: 'ocean', name: 'Ocean', color: '#4f93a8', isBuildable: false },
  LAKE: { id: 'lake', name: 'Lake', color: '#63b4cf', isBuildable: false },
  MOUNTAIN: { id: 'mountain', name: 'Mountain', color: '#808080', isBuildable: false },
  DESERT: { id: 'desert', name: 'Desert', color: '#d2b48c', isBuildable: true },
  GRASSLAND: { id: 'grassland', name: 'Grassland', color: '#98fb98', isBuildable: true },
  PLAINS: { id: 'plains', name: 'Plains', color: '#f0e68c', isBuildable: true },
  TUNDRA: { id: 'tundra', name: 'Tundra', color: '#f0f8ff', isBuildable: true },
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