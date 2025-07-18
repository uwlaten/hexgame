/**
 * @fileoverview This file contains the central configuration for the game.
 * It includes settings for the map, biomes, and other global parameters
 * to make tweaking the game's balance and feel easier.
 */

// Using export default to make it easy to import this single config object elsewhere.
export default {
  /**
   * Defines the *default* dimensions of the game map in tiles.
   * These are used on initial load. Subsequent maps are sized by the UI.
   * width: The number of tiles horizontally.
   * height: The number of tiles vertically.
   */
  mapDimensions: {
    width: 20,
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
      // Rules for forest placement, checked in order. The first matching rule wins.
      biomeRules: {
        // Default rule: all biomes have a base chance of forests based on moisture.
        default: [{
          multiplier: 1.0, // Apply the default moisture value as the chance.
        }],
        // Plains have a higher chance of forests, especially near rivers.
        plains: [
          {
            conditions: [{ type: 'adjacentToRiver' }],
            multiplier: 0.5, // Increase the moisture value for tiles next to rivers.
          },
          {
            multiplier: 0.3, // Otherwise, apply a slightly reduced moisture value.
          },
        ],
        // Steppe only has forests near freshwater (rivers or lakes).
        steppe: [
          {
            conditions: [{ type: 'adjacentToRiver' }],
            multiplier: 0.6, // Allow forests in riparian zones.
          },
          {
            conditions: [{ type: 'neighbor', property: 'biome.id', value: 'lake', operator: 'atLeast', count: 1 }],
            multiplier: 0.7, // Allow forests on lakeshores.
          },
          {
            multiplier: 0.05, // Forbid forests on all other steppe tiles.
          },
        ],
        // Tundra retains its normal moisture value as the chance.
        tundra: [{
          multiplier: 1.0, // Apply the default moisture value as the chance.
        }],
        // Deserts have a very low chance of forests, but oases get a boost.
        desert: [
          {
            conditions: [{ type: 'adjacentToRiver' }],
            boost: 0.5, // Add 0.5 to moisture for oases along rivers.
          },
          {
            conditions: [{ type: 'neighbor', property: 'biome.id', value: 'lake', operator: 'atLeast', count: 1 }],
            boost: 0.5, // Add 0.5 to moisture for oases on lakeshores.
          },
          {
            conditions: [{ type: 'neighbor', property: 'feature.id', value: 'oasis', operator: 'atLeast', count: 1 }],
            boost: 0.5, // Add 0.5 to moisture for oases near Oasis features.
          },
          {
            conditions: [{ type: 'neighbor', property: 'biome.id', value: 'plains', operator: 'atLeast', count: 2 }],
            multiplier: 0.2, // Small chance for forests on desert tiles bordering a significant plains area.
          },
          {
            multiplier: 0, // Reduce the moisture value to 10% for other desert tiles.
          },
        ],
      },
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
    /**
     * The chance (0-1) for an oasis to spawn on a valid desert tile.
     */
    oasisSpawnChance: .2,
    // The threshold (0-1) for a desert tile to be considered "low elevation" for oasis placement.
    oasisLowElevationThreshold: .5,
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
    initialHand: ['CityCentre'],
    mainDeck: {
      Industry: 15,
      Residence: 15,
      Road: 3,
    },
    initialDeckSize: 15,

    // initialDeck: ['CityCentre'],
    // mainDeck: ['Industry', 'Residence', 'Road'],
  },

  /**
   * Holds all tunable parameters for the UI Manager.
   */
  UIConfig: {
    generationSliderRanges: {
      temperature: { min: 0, max: 2, step: 1, value: 1 },
      waterLevel: { min: 20, max: 70, step: 1, value: 40 },
      mapSize: { min: 10, max: 30, step: 1, value: 20 },
    },
    nextTileDisplay: {
      width: 60,
      height: 60,
      hexSize: 25,
    },
    previewShading: {
      // Color for a placement with a negative score.
      negative: 'rgba(255, 0, 0, 0.5)',
      // Color for a placement with a score of exactly 2.
      positive_ok: 'rgba(144, 238, 144, 0.5)',
      // Color for a placement with a score greater than 2.
      positive_good: 'rgba(0, 100, 0, 0.5)',
    },
  },

  /**
   * Defines the style for tile outlines.
   */
  tileOutlineStyle: {
    strokeStyle: 'rgba(255, 0, 0, 0.8)', // Red outline
    lineWidth: 2.5,
  },
  
  tileOutlineDash: [5, 5], // Parameters for dashed format. First number: length of dash; second number: length of gap.

};
