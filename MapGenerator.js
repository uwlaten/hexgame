/**
 * @fileoverview Defines the MapGenerator class for creating game maps.
 * This decouples the map generation logic from the Map data structure itself.
 */

import HexTile from './HexTile.js';
import { BiomeLibrary } from './BiomeLibrary.js';
import { FeatureLibrary } from './FeatureLibrary.js';
import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';

/**
 * A utility class responsible for procedural map generation.
 * By using a static method, we can generate a map without needing to create
 * an instance of the generator itself, making it a lightweight helper.
 */
export default class MapGenerator {
  /**
   * Populates the provided map object's grid with HexTiles.
   * This method modifies the map object directly.
   * @param {import('./Map.js').default} map The Map object to be populated.
   * @param {object} [options={}] The options for map generation.
   * @param {number} [options.waterLevel=40] The percentage of water on the map.
   * @param {string} [options.temperature='temperate'] The temperature setting ('cold', 'temperate', 'hot').
   */
  static generate(map, options = {}) {
    const { waterLevel = 40, temperature = 'temperate' } = options;
    console.log(`Generating map with options:`, { waterLevel, temperature });

    const placeholderBiome = Object.values(BiomeLibrary).find(b => b.isDefaultPlaceholder);
    if (!placeholderBiome) {
      console.error('MapGenerator Error: No biome in BiomeLibrary is marked with isDefaultPlaceholder: true');
      // Stop generation if the placeholder is not defined to prevent further errors.
      return;
    }

    const noise2D = createNoise2D();
    const noiseScale = 0.1; // Smaller values = more "zoomed in", larger continents.

    // 1. Generate a base elevation map using simplex noise.
    const elevationMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        // Get a noise value between -1 and 1.
        const noiseValue = noise2D(x * noiseScale, y * noiseScale);
        // Normalize it to a 0-1 range for easier use later.
        const normalizedValue = (noiseValue + 1) / 2;
        row.push(normalizedValue);
      }
      elevationMap.push(row);
    }

    // 2. Apply a gradient to the elevation map to form a central continent.
    const finalElevationMap = this._applyEdgeControl(elevationMap, map.width, map.height);

    // 3. Determine the sea level threshold based on the desired water percentage.
    const allElevations = finalElevationMap.flat().sort((a, b) => a - b);
    const seaLevelIndex = Math.floor(allElevations.length * (waterLevel / 100));
    const seaLevelThreshold = allElevations[seaLevelIndex];

    // Ensure the grid is empty before we start generating.
    map.grid = [];

    // 4. Create tiles based on the final elevation and sea level.
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const elevation = finalElevationMap[y][x];
        const biome = elevation < seaLevelThreshold ? BiomeLibrary.OCEAN : placeholderBiome;
        const tile = new HexTile(x, y, biome);
        row.push(tile);
      }
      map.grid.push(row);
    }

    // 5. Place mountain ranges and peaks on the land.
    this._generateMountains(map, finalElevationMap, placeholderBiome);

    // 6. Determine climate and assign final biomes to land tiles.
    const { moistureMap } = this._generateClimateAndBiomes(map, options, placeholderBiome);

    // 7. Add detail features like hills.
    this._generateHills(map, finalElevationMap);

    // 8. Add forests based on climate.
    this._generateForests(map, moistureMap);

    // 9. Run final post-processing passes to clean up the map.
    this._runPostProcessingPasses(map, placeholderBiome);
  }

  /**
   * Modifies an elevation map to create a central landmass by lowering the edges.
   * It randomly chooses 1 or 2 edges to "lower", creating a gradient towards them.
   * @param {number[][]} elevationMap The initial 2D array of elevation values (0-1).
   * @param {number} width The width of the map.
   * @param {number} height The height of the map.
   * @returns {number[][]} The modified elevation map.
   * @private
   */
  static _applyEdgeControl(elevationMap, width, height) {
    const modifiedMap = [];
    const numEdges = Math.random() < 0.5 ? 1 : 2; // 50% chance for 1 or 2 low edges
    const edges = ['top', 'bottom', 'left', 'right'];

    // Shuffle edges to pick random ones
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    const lowEdges = edges.slice(0, numEdges);
    console.log('Lowering edges:', lowEdges);

    const hasLow = (edge) => lowEdges.includes(edge);

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        let dx = 1.0, dy = 1.0;

        // Calculate horizontal distance factor (0 at low edge, 1 at opposite side)
        if (hasLow('left') && hasLow('right')) {
          const distFromCenter = Math.abs(x - (width - 1) / 2);
          dx = 1 - (distFromCenter / ((width - 1) / 2));
        } else if (hasLow('left')) {
          dx = x / (width - 1);
        } else if (hasLow('right')) {
          dx = (width - 1 - x) / (width - 1);
        }

        // Calculate vertical distance factor
        if (hasLow('top') && hasLow('bottom')) {
          const distFromCenter = Math.abs(y - (height - 1) / 2);
          dy = 1 - (distFromCenter / ((height - 1) / 2));
        } else if (hasLow('top')) {
          dy = y / (height - 1);
        } else if (hasLow('bottom')) {
          dy = (height - 1 - y) / (height - 1);
        }

        // The multiplier is the minimum of the two distance factors. This creates
        // a nice falloff for both opposite and adjacent lowered edges.
        const multiplier = Math.min(dx, dy);
        row.push(elevationMap[y][x] * multiplier);
      }
      modifiedMap.push(row);
    }
    return modifiedMap;
  }

  /**
   * The main method for the Tectonic Phase. Places mountain ranges on the map.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} elevationMap The final elevation map, used to place lone peaks.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _generateMountains(map, elevationMap, placeholderBiome) {
    const mountainConfig = {
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
    };

    const allLandTiles = this._getLandTiles(map);
    // This set will track all mountains placed across all ranges to detect convergence.
    const allMountainCoords = new Set();

    if (allLandTiles.length < mountainConfig.minLandTiles) return;

    const coastalCoords = new Set();
    const inlandTiles = [];
    const coastalTiles = [];
    for (const tile of allLandTiles) {
      // Forbid chains starting on the absolute edge of the map.
      const isEdge = tile.x === 0 || tile.x === map.width - 1 || tile.y === 0 || tile.y === map.height - 1;
      if (isEdge) continue;

      const neighbors = this._getNeighbors(tile.x, tile.y);
      const isCoastal = neighbors.some(coord => {
        const neighborTile = map.getTileAt(coord.x, coord.y);
        return neighborTile?.biome.id === BiomeLibrary.OCEAN.id;
      });
      if (isCoastal) coastalCoords.add(`${tile.x},${tile.y}`);

      if (isCoastal) {
        coastalTiles.push(tile);
      } else {
        inlandTiles.push(tile);
      }
    }

    const numRanges = Math.floor(Math.random() * (mountainConfig.numRanges.max - mountainConfig.numRanges.min + 1)) + mountainConfig.numRanges.min;

    for (let i = 0; i < numRanges; i++) {
      const targetLength = mountainConfig.rangeLengths[Math.floor(Math.random() * mountainConfig.rangeLengths.length)];

      const startInland = Math.random() < mountainConfig.inlandStartChance;
      let startTilePool = (startInland && inlandTiles.length > 0) ? inlandTiles : coastalTiles;
      if (startTilePool.length === 0) startTilePool = inlandTiles.length > 0 ? inlandTiles : coastalTiles;
      if (startTilePool.length === 0) continue; // No valid start tiles

      let currentTile = startTilePool[Math.floor(Math.random() * startTilePool.length)];
      if (!currentTile || currentTile.biome.id !== placeholderBiome.id) continue;

      let direction = Math.floor(Math.random() * 6);
      const startTile = currentTile;
      const currentRangeTiles = new Set();

      for (let j = 0; j < targetLength; j++) {
        if (!currentTile || currentTile.biome.id !== placeholderBiome.id) break;

        currentTile.biome = BiomeLibrary.MOUNTAIN;
        const currentKey = `${currentTile.x},${currentTile.y}`;
        currentRangeTiles.add(currentKey);
        allMountainCoords.add(currentKey);

        // NEW RULE: After placing a mountain, check if it connects to another range.
        const neighborsOfCurrent = this._getNeighbors(currentTile.x, currentTile.y);
        const touchesOtherMountain = neighborsOfCurrent.some(c => {
          const key = `${c.x},${c.y}`;
          return allMountainCoords.has(key) && !currentRangeTiles.has(key);
        });
        if (touchesOtherMountain) {
          break; // Stop extending this range as it has converged.
        }

        // Create a "bulge" in the mountain range.
        if (Math.random() < mountainConfig.bulgeChance) {
          const neighbors = this._getNeighbors(currentTile.x, currentTile.y);
          const randomNeighborCoords = neighbors[Math.floor(Math.random() * neighbors.length)];
          const bulgeTile = map.getTileAt(randomNeighborCoords.x, randomNeighborCoords.y);
          const bulgeTouchesOther = this._getNeighbors(randomNeighborCoords.x, randomNeighborCoords.y).some(c => {
            const key = `${c.x},${c.y}`;
            return allMountainCoords.has(key) && !currentRangeTiles.has(key);
          });
          if (bulgeTile?.biome.id === placeholderBiome.id && !bulgeTouchesOther) {
            bulgeTile.biome = BiomeLibrary.MOUNTAIN;
          }
        }

        // --- New Direction Selection Logic ---
        const allNeighbors = this._getNeighbors(currentTile.x, currentTile.y);
        const forwardDirections = [(direction - 1 + 6) % 6, direction, (direction + 1) % 6];

        // Calculate the overall vector from the start of the range to the current tile.
        const startCube = this._offsetToCube(startTile.x, startTile.y);
        const currentCube = this._offsetToCube(currentTile.x, currentTile.y);
        const overallVector = {
          q: currentCube.q - startCube.q,
          r: currentCube.r - startCube.r,
        };

        const weightedChoices = [];
        for (const dir of forwardDirections) {
          const coord = allNeighbors[dir];
          const neighborTile = coord ? map.getTileAt(coord.x, coord.y) : null;

          if (!neighborTile || neighborTile.biome.id !== placeholderBiome.id) continue;

          // Forbid loops by checking if the next tile is already in this range.
          if (currentRangeTiles.has(`${coord.x},${coord.y}`)) continue;

          let weight = 10.0; // Base weight for a valid move.
          const isEdge = coord.x === 0 || coord.x === map.width - 1 || coord.y === 0 || coord.y === map.height - 1;
          const isCoastal = coastalCoords.has(`${coord.x},${coord.y}`);

          if (isEdge) weight *= 0.1; // Heavily disfavour moving to the edge.
          else if (isCoastal) weight *= 0.5; // Disfavour moving to the coast.

          // Penalize moving back towards the start of the range to prevent U-shapes.
          // We only do this after a few steps to allow the range to establish a direction.
          if (j > 2) {
            const nextCube = this._offsetToCube(coord.x, coord.y);
            const stepVector = {
              q: nextCube.q - currentCube.q,
              r: nextCube.r - currentCube.r,
            };
            // The dot product of the overall vector and the step vector.
            const dotProduct = overallVector.q * stepVector.q + overallVector.r * stepVector.r;
            if (dotProduct < 0) weight *= 0.1; // Penalize "backwards" movement.
          }

          weightedChoices.push({ direction: dir, weight });
        }

        const choice = this._getWeightedRandomChoice(weightedChoices);
        if (!choice) break; // Walker is blocked.

        direction = choice.direction;
        const nextTileCoords = allNeighbors[direction];
        if (nextTileCoords) {
          currentTile = map.getTileAt(nextTileCoords.x, nextTileCoords.y);
        } else {
          break; // Walker hit the edge of the map.
        }
      }
    }

    // --- Lone Peak Generation ---
    // Get all tiles that are still plains after range generation.
    const remainingPlains = this._getLandTiles(map).filter(
      tile => tile.biome.id === placeholderBiome.id
    );

    if (remainingPlains.length === 0) return;

    // Pair each plains tile with its elevation.
    const plainsWithElevation = remainingPlains.map(tile => ({
      tile: tile,
      elevation: elevationMap[tile.y][tile.x],
    }));

    // Sort by elevation, highest first, and convert the top 1% to mountains.
    // We will iterate through the candidates and place peaks until we reach our target,
    // skipping any invalid placements.
    plainsWithElevation.sort((a, b) => b.elevation - a.elevation);
    const numPeaksToPlace = Math.ceil(plainsWithElevation.length * mountainConfig.lonePeakPercentage);
    let peaksPlaced = 0;

    for (const candidate of plainsWithElevation) {
      if (peaksPlaced >= numPeaksToPlace) break;

      const tile = candidate.tile;

      // Rule: Forbid placing lone peaks on the absolute edge of the map.
      const isEdge = tile.x === 0 || tile.x === map.width - 1 || tile.y === 0 || tile.y === map.height - 1;
      if (isEdge) continue;

      // Rule: Forbid placing lone peaks adjacent to any existing mountain.
      const isAdjacentToMountain = this._getNeighbors(tile.x, tile.y).some(c =>
        allMountainCoords.has(`${c.x},${c.y}`)
      );
      if (isAdjacentToMountain) continue;

      // If all checks pass, place the mountain.
      tile.biome = BiomeLibrary.MOUNTAIN;
      allMountainCoords.add(`${tile.x},${tile.y}`);
      peaksPlaced++;
    }
  }

  /**
   * Returns a list of all tiles on the map that are not oceans.
   * @param {import('./Map.js').default} map The map object.
   * @returns {HexTile[]} An array of land tiles.
   * @private
   */
  static _getLandTiles(map) {
    return map.grid.flat().filter(tile => tile.biome.id !== BiomeLibrary.OCEAN.id);
  }

  /**
   * Gets the coordinates of the 6 neighbors for a hex in an "odd-r" layout.
   * @param {number} x The x-coordinate of the hex.
   * @param {number} y The y-coordinate of the hex.
   * @returns {Array<{x: number, y: number}>} An array of neighbor coordinates.
   * @private
   */
  static _getNeighbors(x, y) {
    const isOddRow = y & 1;
    const directions = [
      // Even rows
      [
        { x: x + 1, y: y },     // E
        { x: x, y: y + 1 },     // SE
        { x: x - 1, y: y + 1 }, // SW
        { x: x - 1, y: y },     // W
        { x: x - 1, y: y - 1 }, // NW
        { x: x, y: y - 1 },     // NE
      ],
      // Odd rows
      [
        { x: x + 1, y: y },     // E
        { x: x + 1, y: y + 1 }, // SE
        { x: x, y: y + 1 },     // SW
        { x: x - 1, y: y },     // W
        { x: x, y: y - 1 },     // NW
        { x: x + 1, y: y - 1 }, // NE
      ],
    ];

    return directions[isOddRow];
  }

  /**
   * Converts "odd-r" offset coordinates to cube coordinates.
   * @param {number} x The x-coordinate (col).
   * @param {number} y The y-coordinate (row).
   * @returns {{q: number, r: number, s: number}} The cube coordinates.
   * @private
   */
  static _offsetToCube(x, y) {
    const q = x - (y - (y & 1)) / 2;
    const r = y;
    const s = -q - r;
    return { q, r, s };
  }

  /**
   * Calculates the grid distance between two hexes using their cube coordinates.
   * @param {{q: number, r: number, s: number}} a The cube coordinates of the first hex.
   * @param {{q: number, r: number, s: number}} b The cube coordinates of the second hex.
   * @returns {number} The distance in hexes.
   * @private
   */
  static _getCubeDistance(a, b) {
    // This is the standard distance formula for cube coordinates.
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
  }

  /**
   * Selects a random item from a list of choices, where each choice has a weight.
   * @param {Array<object>} choices An array of objects, each with a 'weight' property.
   * @returns {object|null} The selected choice object, or null if no choices are available.
   * @private
   */
  static _getWeightedRandomChoice(choices) {
    if (!choices || choices.length === 0) return null;

    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    if (totalWeight <= 0) return choices[0]; // Fallback if all weights are zero

    let random = Math.random() * totalWeight;

    for (const choice of choices) {
      if (random < choice.weight) {
        return choice;
      }
      random -= choice.weight;
    }

    return choices[choices.length - 1]; // Fallback in case of floating point inaccuracies
  }

  /**
   * The main method for the Climate Phase. Generates climate data maps
   * and assigns final biomes to land tiles based on the results.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {object} options The generation options from the UI.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _generateClimateAndBiomes(map, options, placeholderBiome) {
    const climateConfig = { // This could be moved to a higher-level config if needed.
      coastalModeration: 0.2, // How much warmer/cooler coasts are (0-1).
      moderationBlurPasses: 3, // How many tiles inland the coastal effect bleeds.
      moistureNoiseScale: 0.08, // Zoom level for base moisture noise.
      rainShadowStrength: 0.5, // How much moisture is reduced behind mountains (0-1).
      rainShadowDistance: 10, // How far downwind the rain shadow effect reaches.
      biomeNoiseScale: 0.15, // Zoom level for the biome tie-breaker noise.
      iceMaxRow: 3, // The max row (from top) where ice can form.
      iceTempThreshold: 0.05, // The max temperature (0-1) for ice to form.
    };

    // --- 1. Generate Base Temperature Map (Top-to-bottom gradient) ---
    const baseTemperatureMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      const temp = y / (map.height - 1); // 0.0 at top (cold), 1.0 at bottom (hot)
      for (let x = 0; x < map.width; x++) {
        row.push(temp);
      }
      baseTemperatureMap.push(row);
    }

    // --- 2. Generate Coastal Moderation Map ---
    let moderationMap = Array.from({ length: map.height }, () => Array(map.width).fill(0));
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);
        if (tile.biome.id === BiomeLibrary.OCEAN.id) continue;

        const isCoastal = this._getNeighbors(x, y).some(c => map.getTileAt(c.x, c.y)?.biome.id === BiomeLibrary.OCEAN.id);
        if (isCoastal) {
          // Positive value warms the north, negative value cools the south.
          const baseTemp = baseTemperatureMap[y][x];
          moderationMap[y][x] = climateConfig.coastalModeration * (0.5 - baseTemp) * 2;
        }
      }
    }

    // --- 3. Blur/Diffuse the Moderation Map to bleed the effect inland ---
    for (let pass = 0; pass < climateConfig.moderationBlurPasses; pass++) {
      const nextModerationMap = Array.from({ length: map.height }, () => Array(map.width).fill(0));
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const neighbors = this._getNeighbors(x, y);
          let sum = moderationMap[y][x];
          let count = 1;
          for (const coord of neighbors) {
            if (map.getTileAt(coord.x, coord.y)) { // Check if neighbor is on map
              sum += moderationMap[coord.y][coord.x];
              count++;
            }
          }
          nextModerationMap[y][x] = sum / count;
        }
      }
      moderationMap = nextModerationMap;
    }

    // --- 4. Create Final Temperature Map ---
    const finalTemperatureMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const baseTemp = baseTemperatureMap[y][x];
        const moderation = moderationMap[y][x];
        // Clamp the final temperature between 0 and 1.
        const finalTemp = Math.max(0, Math.min(1, baseTemp + moderation));
        row.push(finalTemp);
      }
      finalTemperatureMap.push(row);
    }

    // --- 5. Generate Moisture Map with base noise ---
    const moistureNoise2D = createNoise2D();
    const moistureMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const noiseValue = moistureNoise2D(x * climateConfig.moistureNoiseScale, y * climateConfig.moistureNoiseScale);
        row.push((noiseValue + 1) / 2); // Normalize to 0-1
      }
      moistureMap.push(row);
    }

    // --- 6. Apply Rain Shadow based on a global wind vector ---
    const windVector = this._getWindVector(map);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.getTileAt(x, y).biome.id === BiomeLibrary.OCEAN.id) continue;

        // Trace a line against the wind to see if we hit a mountain
        let currentX = x;
        let currentY = y;
        for (let i = 0; i < climateConfig.rainShadowDistance; i++) {
          // Move against the wind
          currentX -= windVector.dx;
          currentY -= windVector.dy;

          const roundedX = Math.round(currentX);
          const roundedY = Math.round(currentY);

          const tile = map.getTileAt(roundedX, roundedY);
          if (tile && tile.biome.id === BiomeLibrary.MOUNTAIN.id) {
            // We are in a rain shadow. Reduce moisture.
            const shadowFactor = 1.0 - (i / climateConfig.rainShadowDistance); // Fades with distance
            const moistureReduction = climateConfig.rainShadowStrength * shadowFactor;
            moistureMap[y][x] = Math.max(0, moistureMap[y][x] - moistureReduction);
            break; // Stop tracing once a mountain is found
          }
        }
      }
    }

    // --- 7. Generate Biome Noise Map for tie-breaking ---
    const biomeNoise2D = createNoise2D();
    const biomeNoiseMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const noiseValue = biomeNoise2D(x * climateConfig.biomeNoiseScale, y * climateConfig.biomeNoiseScale);
        row.push((noiseValue + 1) / 2); // Normalize to 0-1
      }
      biomeNoiseMap.push(row);
    }

    // --- 8. Assign Final Biomes to Land Tiles ---
    const tempBands = {
      cold: { cold: 0.5, temperate: 0.9, hot: 1.0 },
      temperate: { cold: 0.2, temperate: 0.8, hot: 1.0 },
      hot: { cold: 0.1, temperate: 0.4, hot: 1.0 },
    }[options.temperature];

    const moistureBands = { dry: 0.33, normal: 0.66 };

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);
        if (tile.biome.id !== placeholderBiome.id) continue;

        const temp = finalTemperatureMap[y][x];
        const moisture = moistureMap[y][x];

        const tempBand = temp < tempBands.cold ? 'cold' : (temp < tempBands.temperate ? 'temperate' : 'hot');
        const moistureBand = moisture < moistureBands.dry ? 'dry' : (moisture < moistureBands.normal ? 'normal' : 'wet');

        const candidates = Object.values(BiomeLibrary).filter(b =>
          b.climate &&
          b.climate.temperature.includes(tempBand) &&
          b.climate.moisture.includes(moistureBand)
        );

        if (candidates.length > 0) {
          const biomeNoise = biomeNoiseMap[y][x];
          const index = Math.floor(biomeNoise * candidates.length);
          tile.biome = candidates[index];
        }
      }
    }

    // --- 9. Final Ice Pass ---
    for (let y = 0; y < climateConfig.iceMaxRow; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);
        if (tile.biome.id === BiomeLibrary.OCEAN.id && finalTemperatureMap[y][x] < climateConfig.iceTempThreshold) {
          tile.biome = BiomeLibrary.ICE;
        }
      }
    }

    return { moistureMap };
  }

  /**
   * Fixes biomes that are in illogical locations, like deserts in the arctic.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _fixProblematicBiomes(map, placeholderBiome) {
    const tilesToConvert = [];
    const allTiles = map.grid.flat();
    const tundraTiles = allTiles.filter(t => t.biome.id === BiomeLibrary.TUNDRA.id);
    const desertTiles = allTiles.filter(t => t.biome.id === BiomeLibrary.DESERT.id);
    const topTenPercentRow = Math.floor(map.height * 0.1);

    // Rule 1: Check for deserts too close to tundra
    if (tundraTiles.length > 0 && desertTiles.length > 0) {
      for (const desert of desertTiles) {
        const desertCube = this._offsetToCube(desert.x, desert.y);
        let tooClose = false;
        for (const tundra of tundraTiles) {
          const tundraCube = this._offsetToCube(tundra.x, tundra.y);
          if (this._getCubeDistance(desertCube, tundraCube) <= 3) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) {
          tilesToConvert.push(desert);
        }
      }
    }

    // Rule 2: Check for deserts in the far north
    for (const desert of desertTiles) {
      if (desert.y < topTenPercentRow) {
        // Avoid adding duplicates if already marked for conversion
        if (!tilesToConvert.includes(desert)) {
          tilesToConvert.push(desert);
        }
      }
    }

    // Now, perform the conversions for all flagged tiles
    for (const tile of tilesToConvert) {
      const neighbors = this._getNeighbors(tile.x, tile.y);
      let savannahNeighbors = 0;
      let grasslandNeighbors = 0;

      for (const coord of neighbors) {
        const neighbor = map.getTileAt(coord.x, coord.y);
        if (neighbor?.biome.isBuildable) {
          if (neighbor.biome.id === placeholderBiome.id) savannahNeighbors++;
          if (neighbor.biome.id === BiomeLibrary.GRASSLAND.id) grasslandNeighbors++;
        }
      }

      // Convert to the most common valid neighbor, defaulting to the placeholder biome.
      tile.biome = (grasslandNeighbors > savannahNeighbors) ? BiomeLibrary.GRASSLAND : placeholderBiome;
    }
  }

  /**
   * Runs a series of post-processing passes to clean up the map and enforce rules.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _runPostProcessingPasses(map, placeholderBiome) {
    // Pass 1: Fix problematic biome placements (the original logic).
    this._fixProblematicBiomes(map, placeholderBiome);

    // Pass 2: Smooth out isolated "island" biomes based on their neighbors.
    this._smoothBiomeIslands(map);

    // Pass 3: Convert small, land-locked oceans into lakes.
    this._convertInlandSeasToLakes(map);
  }

  /**
   * Places forests on the map based on moisture and biome type.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} moistureMap The final moisture map data.
   * @private
   */
  static _generateForests(map, moistureMap) {
    const forestsConfig = {
      // Base chance is the moisture level. These are multipliers.
      biomeMultipliers: {
        tundra: 1,
        savannah: 0.4,
        grassland: 0.5,
        desert: 0.1,
      },
      // A significant boost for desert tiles next to water to create oases.
      oasisMoistureBoost: 0.5,
    };

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);

        // Skip if the tile cannot support features or already has one.
        if (!tile.biome.canSupportFeatures || tile.feature) {
          continue;
        }

        let chance = moistureMap[y][x];
        const biomeId = tile.biome.id;

        // Apply biome-specific multipliers.
        if (forestsConfig.biomeMultipliers[biomeId]) {
          chance *= forestsConfig.biomeMultipliers[biomeId];
        }

        // Check for the "oasis" rule on desert tiles.
        if (biomeId === BiomeLibrary.DESERT.id) {
          const isAdjacentToWater = this._getNeighbors(x, y).some(c => {
            const neighbor = map.getTileAt(c.x, c.y);
            return neighbor && (neighbor.biome.id === BiomeLibrary.OCEAN.id || neighbor.biome.id === BiomeLibrary.LAKE.id);
          });
          if (isAdjacentToWater) {
            chance += forestsConfig.oasisMoistureBoost;
          }
        }

        if (Math.random() < chance) {
          tile.feature = FeatureLibrary.FOREST;
        }
      }
    }
  }

  /**
   * The main method for the Erosion and Detail Phase. Places hills on the map.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} elevationMap The final elevation map, used to place isolated hills.
   * @private
   */
  static _generateHills(map, elevationMap) {
    const hillsConfig = {
      // The base chance (0-1) for a tile directly adjacent to a mountain to become a hill.
      adjacentToMountainChance: 0.6,
      // How much the chance is reduced for each tile of distance away from a mountain.
      distanceFalloff: 0.2,
      // The minimum elevation (0-1) for a tile to be considered for isolated hills.
      isolatedHillElevationThreshold: 0.6,
      // The chance (0-1) for a valid high-elevation tile to become an isolated hill.
      isolatedHillChance: 0.05,
    };

    // --- Proximity-Based Hills (Foothills) ---
    const queue = [];
    const visited = new Set();
    const allLandTiles = this._getLandTiles(map);

    // 1. Initialize the queue with all valid tiles directly adjacent to mountains.
    for (const tile of allLandTiles) {
      if (tile.biome.id === BiomeLibrary.MOUNTAIN.id) {
        const neighbors = this._getNeighbors(tile.x, tile.y);
        for (const coord of neighbors) {
          const neighborTile = map.getTileAt(coord.x, coord.y);
          // Check if the neighbor can support features and hasn't been queued yet.
          if (neighborTile && neighborTile.biome.canSupportFeatures && !visited.has(neighborTile)) {
            queue.push({ tile: neighborTile, distance: 1 });
            visited.add(neighborTile);
          }
        }
      }
    }

    // 2. Process the queue using a breadth-first approach to spread hills outwards.
    let head = 0;
    while (head < queue.length) {
      const { tile, distance } = queue[head++]; // Efficiently process the queue.

      const chance = hillsConfig.adjacentToMountainChance - (distance - 1) * hillsConfig.distanceFalloff;

      if (Math.random() < chance) {
        tile.feature = FeatureLibrary.HILLS;

        // If a hill is placed, add its neighbors to the queue to continue the spread.
        const neighbors = this._getNeighbors(tile.x, tile.y);
        for (const coord of neighbors) {
          const neighborTile = map.getTileAt(coord.x, coord.y);
          if (neighborTile && neighborTile.biome.canSupportFeatures && !neighborTile.feature && !visited.has(neighborTile)) {
            visited.add(neighborTile);
            queue.push({ tile: neighborTile, distance: distance + 1 });
          }
        }
      }
    }

    // --- Isolated Hills ---
    // 3. Iterate through all land tiles again to place isolated hills on high ground.
    for (const tile of allLandTiles) {
      // Skip if the tile cannot support features or already has one.
      if (!tile.biome.canSupportFeatures || tile.feature) continue;

      if (elevationMap[tile.y][tile.x] < hillsConfig.isolatedHillElevationThreshold) continue;

      // Ensure it's not adjacent to a mountain to keep it truly isolated.
      const isAdjacentToMountain = this._getNeighbors(tile.x, tile.y).some(c => map.getTileAt(c.x, c.y)?.biome.id === BiomeLibrary.MOUNTAIN.id);
      if (!isAdjacentToMountain && Math.random() < hillsConfig.isolatedHillChance) {
        tile.feature = FeatureLibrary.HILLS;
      }
    }
  }

  /**
   * Determines a global wind vector by finding the map edge with the most ocean.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{dx: number, dy: number}} A vector representing the wind direction.
   * @private
   */
  static _getWindVector(map) {
    const edgeCounts = { top: 0, bottom: 0, left: 0, right: 0 };

    for (let x = 0; x < map.width; x++) {
      if (map.getTileAt(x, 0)?.biome.id === BiomeLibrary.OCEAN.id) edgeCounts.top++;
      if (map.getTileAt(x, map.height - 1)?.biome.id === BiomeLibrary.OCEAN.id) edgeCounts.bottom++;
    }
    for (let y = 0; y < map.height; y++) {
      if (map.getTileAt(0, y)?.biome.id === BiomeLibrary.OCEAN.id) edgeCounts.left++;
      if (map.getTileAt(map.width - 1, y)?.biome.id === BiomeLibrary.OCEAN.id) edgeCounts.right++;
    }

    const sortedEdges = Object.entries(edgeCounts).sort((a, b) => b[1] - a[1]);
    const wettestEdge = sortedEdges[0][0];
    console.log(`Prevailing wind from: ${wettestEdge}`);

    switch (wettestEdge) {
      case 'top': return { dx: 0, dy: 1 };
      case 'bottom': return { dx: 0, dy: -1 };
      case 'right': return { dx: -1, dy: 0 };
      case 'left': default: return { dx: 1, dy: 0 };
    }
  }

  /**
   * Smoothes out single-tile biome "islands" by converting them to their most common neighbor.
   * @param {import('./Map.js').default} map The map object to modify.
   * @private
   */
  static _smoothBiomeIslands(map) {
    const conversions = [];
    // These biomes are structural and should not be converted, nor should they
    // influence the conversion of their neighbors.
    const biomesToIgnore = new Set([
      BiomeLibrary.MOUNTAIN.id,
      BiomeLibrary.ICE.id,
      BiomeLibrary.OCEAN.id,
    ]);

    for (const tile of map.grid.flat()) {
      // We only consider converting non-structural, buildable land biomes.
      if (biomesToIgnore.has(tile.biome.id) || !tile.biome.isBuildable) {
        continue;
      }

      const biomeCounts = {};
      for (const coord of this._getNeighbors(tile.x, tile.y)) {
        const neighbor = map.getTileAt(coord.x, coord.y);
        // When counting, we ignore neighbors that are structural.
        if (neighbor && !biomesToIgnore.has(neighbor.biome.id)) {
          const biomeId = neighbor.biome.id;
          biomeCounts[biomeId] = (biomeCounts[biomeId] || 0) + 1;
        }
      }

      // If the tile has any neighbor of its own kind, it's not an island. Skip it.
      if (biomeCounts[tile.biome.id]) {
        continue;
      }

      if (Object.keys(biomeCounts).length === 0) continue;

      // Find the most common neighbor biome(s).
      let maxCount = 0;
      let majorityBiomes = [];
      for (const biomeId in biomeCounts) {
        if (biomeCounts[biomeId] > maxCount) {
          maxCount = biomeCounts[biomeId];
          majorityBiomes = [biomeId];
        } else if (biomeCounts[biomeId] === maxCount) {
          majorityBiomes.push(biomeId);
        }
      }

      // If there is a single, clear majority biome among the neighbors, convert the island.
      // We don't need to check if the majority is different from the tile's own biome,
      // because we already confirmed this tile has no neighbors of its own kind.
      if (majorityBiomes.length === 1) {
        const newBiome = Object.values(BiomeLibrary).find(b => b.id === majorityBiomes[0]);
        if (newBiome) {
          conversions.push({ tile, newBiome });
        }
      }
    }

    // Apply all conversions at the end to avoid chain reactions in a single pass.
    for (const { tile, newBiome } of conversions) {
      tile.biome = newBiome;
    }
  }

  /**
   * Finds small, land-locked bodies of ocean and converts them to lakes.
   * This uses a Breadth-First Search (BFS) to find connected components of ocean tiles.
   * @param {import('./Map.js').default} map The map object to modify.
   * @private
   */
  static _convertInlandSeasToLakes(map) {
    const visited = new Set();

    for (const startTile of map.grid.flat()) {
      // Start a search only if we find an unvisited ocean tile.
      if (startTile.biome.id === BiomeLibrary.OCEAN.id && !visited.has(startTile)) {
        const component = [];
        const queue = [startTile];
        visited.add(startTile);
        let isSurrounded = true;

        let head = 0;
        while (head < queue.length) {
          const currentTile = queue[head++];
          component.push(currentTile);

          // If any tile in the component touches the map edge, it's part of the world ocean.
          if (currentTile.x === 0 || currentTile.x === map.width - 1 || currentTile.y === 0 || currentTile.y === map.height - 1) {
            isSurrounded = false;
          }

          // Add its unvisited ocean neighbors to the queue to continue the search.
          for (const coord of this._getNeighbors(currentTile.x, currentTile.y)) {
            const neighbor = map.getTileAt(coord.x, coord.y);
            if (neighbor && neighbor.biome.id === BiomeLibrary.OCEAN.id && !visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        // After the search is complete, evaluate the component.
        // If it's fully surrounded by land and has a size of 1 or 2, convert it to a lake.
        if (isSurrounded && (component.length === 1 || component.length === 2)) {
          for (const tile of component) {
            tile.biome = BiomeLibrary.LAKE;
          }
        }
      }
    }
  }
}