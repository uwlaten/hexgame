/**
 * @fileoverview This file contains the central configuration for the game.
 * It includes settings for the map, biomes, and other global parameters
 * to make tweaking the game's balance and feel easier.
 */

// Using export default to make it easy to import this single config object elsewhere.
export default {
  /**
   * Defines the dimensions of the game map in tiles.
   * width: The number of tiles horizontally.
   * height: The number of tiles vertically.
   */
  mapDimensions: {
    width: 25,
    height: 20,
  },

  /**
   * Holds all tunable parameters for the procedural map generator.
   */
  MapGeneratorConfig: {
    // The "zoom level" for the base elevation noise that forms continents.
    // Smaller values = larger, more sprawling continents.
    baseElevationNoiseScale: 0.1,
    mountains: {
      // The number of mountain ranges to generate.
      numRanges: { min: 1, max: 3 },
      // A weighted pool of possible lengths for each range. More entries for a number means it's more likely to be picked.
      rangeLengths: [5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 10, 11, 12],
      // The probability (0-1) that a mountain range will start on an inland tile vs. a coastal one.
      inlandStartChance: 0.9,
      // The probability (0-1) that a segment of a range will create an adjacent "bulge", making the range thicker.
      bulgeChance: 0.1,
      // The percentage (0-1) of the highest-elevation plains tiles that will be converted into lone mountain peaks.
      lonePeakPercentage: 0.01,
      // The minimum number of land tiles required on the map to attempt mountain generation.
      minLandTiles: 20,
    },
    climate: {
      coastalModeration: 0.2, // How much warmer/cooler coasts are (0-1).
      moderationBlurPasses: 3, // How many tiles inland the coastal effect bleeds.
      moistureNoiseScale: 0.08, // Zoom level for base moisture noise.
      rainShadowStrength: 0.5, // How much moisture is reduced behind mountains (0-1).
      rainShadowDistance: 10, // How far downwind the rain shadow effect reaches.
      biomeNoiseScale: 0.15, // Zoom level for the biome tie-breaker noise.
      iceMaxRow: 3, // The max row (from top) where ice can form.
      iceTempThreshold: 0.05, // The max temperature (0-1) for ice to form.
    },
    hills: {
      // The base chance (0-1) for a tile directly adjacent to a mountain to become a hill.
      adjacentToMountainChance: 0.6,
      // How much the chance is reduced for each tile of distance away from a mountain.
      distanceFalloff: 0.2,
      // The minimum elevation (0-1) for a tile to be considered for isolated hills.
      isolatedHillElevationThreshold: 0.6,
      // The chance (0-1) for a valid high-elevation tile to become an isolated hill.
      isolatedHillChance: 0.05,
    },
    forests: {
      // Base chance is the moisture level. These are multipliers.
      biomeMultipliers: {
        tundra: 1,
        savannah: 0.4,
        grassland: 0.5,
        desert: 0.1,
      },
      // A significant boost for desert tiles next to water to create oases.
      oasisMoistureBoost: 0.5,
    },
    rivers: {
      numRivers: { min: 2, max: 4 },
      sourceWeights: {
        // The weight for each potential source type. Higher is more likely.
        // These keys should correspond to biome or feature IDs.
        mountain: 2,
        ice: 0,
        hills: 1,
      },
      minLength: 7, // A river must have at least this many segments.
      maxAttemptsPerRiver: 10, // Prevents infinite loops if no good sources are left.
      maxDepth: 150, // Safety break for river pathfinding recursion.
    },
  },

  /**
   * Holds all tunable parameters for the renderer.
   */
  RendererConfig: {
    // The radius of a hex tile in pixels from its center to a corner.
    hexSize: 20,
    // Padding around the map in pixels to prevent border clipping.
    padding: 1,
    hexBorderStyle: {
      strokeStyle: '#333',
      lineWidth: 1,
    },
    riverStyle: {
      strokeStyle: '#0064a7ff',
      lineWidth: 4,
      lineCap: 'round',
      lineJoin: 'round',
    },
  },

  /**
   * Holds all tunable parameters for the player.
   */
  PlayerConfig: {
    // The building IDs that the player starts with in their deck.
    initialDeck: [
      'Residence',
      'Residence',
      'Residence',
      'Residence',
      'Residence',
    ],
  },

  /**
   * Holds all tunable parameters for the UI Manager.
   */
  UIConfig: {
    generationSliderRanges: {
      temperature: { min: 0, max: 2, step: 1, value: 1 },
      waterLevel: { min: 20, max: 70, step: 1, value: 40 },
    },
    nextTileDisplay: {
      width: 60,
      height: 60,
      hexSize: 25,
    },
  },
};