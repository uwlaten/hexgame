/**
 * @fileoverview Defines the MapGenerator class for creating game maps.
 * This decouples the map generation logic from the Map data structure itself.
 */

import Config from './Config.js';
import HexTile from './HexTile.js';
import HexGridUtils from './HexGridUtils.js';
import { BiomeLibrary } from './BiomeLibrary.js';
import { FeatureLibrary } from './FeatureLibrary.js';
import { ResourceLibrary } from './ResourceLibrary.js';
import { Building } from './Building.js';
import { Resource } from './Resource.js';
import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';

/**
 * A utility class responsible for procedural map generation.
 * By using a static method, we can generate a map without needing to create
 * an instance of the generator itself, making it a lightweight helper.
 */
export default class MapGenerator {
  // Seed to allow map regeneration.  If null, a new seed is generated.
  static seed = null;

  /**
   * Populates the provided map object's grid with HexTiles.
   * This method modifies the map object directly.
   * @param {import('./Map.js').default} map The Map object to be populated.
   * @param {object} [options={}] The options for map generation.
   * @param {number} [options.waterLevel=40] The percentage of water on the map.
   * @param {string} [options.temperature='temperate'] The temperature setting ('cold', 'temperate', 'hot').
   * @returns {string[]} An array of log messages generated during the process.
   */
  static generate(map, options = {}) {
    const { waterLevel = 40, temperature = 'temperate', mapSize } = options;

    // If mapSize is provided by the UI, override the map's default dimensions.
    if (mapSize) {
      map.width = mapSize;
      map.height = mapSize;
    }

    const log = [];
    log.push(`Generating map with options: waterLevel=${waterLevel}, temperature=${temperature}, size=${map.width}x${map.height}`);

    const placeholderBiome = Object.values(BiomeLibrary).find(b => b.isDefaultPlaceholder);
    if (!placeholderBiome) {
      console.error('MapGenerator Error: No biome in BiomeLibrary is marked with isDefaultPlaceholder: true');
      // Stop generation if the placeholder is not defined to prevent further errors.
      return ['Error: No default placeholder biome found.'];
    }

 // Initialize the seed and PRNG. If no seed is provided, create a random one.
    // This ensures every map is reproducible.
    this.seed = options.seed || Math.random().toString(36).substring(2, 15);
    log.push(`Using seed: ${this.seed}`);

    // Create a deterministic pseudo-random number generator (PRNG) based on the seed.
    // This Mulberry32 implementation is simple and effective for this purpose.
    let seedNum = 0;
    for (let i = 0; i < this.seed.length; i++) {
        seedNum = (seedNum << 5) - seedNum + this.seed.charCodeAt(i);
        seedNum |= 0; // Convert to 32bit integer
    }
    const prng = () => {
      let t = seedNum += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    const noise2D = createNoise2D(prng);
    const noiseScale = Config.MapGeneratorConfig.baseElevationNoiseScale;

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
    const finalElevationMap = this._applyEdgeControl(elevationMap, map.width, map.height, log, prng);

    // 3. Determine the sea level threshold based on the desired water percentage.
    const allElevations = finalElevationMap.flat().sort((a, b) => a - b);
    const seaLevelIndex = Math.floor(allElevations.length * (waterLevel / 100));
    const seaLevelThreshold = allElevations[seaLevelIndex];

    // Ensure the grid is empty before we start generating.
    map.rivers.clear(); // Clear any previous river data.
    map.claimedLinks.clear(); // Clear any previous claim data.
    map.grid = [];

    // 4. Create tiles based on the final elevation and sea level.
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const elevation = finalElevationMap[y][x];
        const biome = elevation < seaLevelThreshold ? BiomeLibrary.OCEAN : placeholderBiome;
        const tile = new HexTile(x, y, biome, null, null, map); // Pass the map reference here.
        row.push(tile);
      }
      map.grid.push(row);
    }

    // 5. Place mountain ranges and peaks on the land.
    this._generateMountains(map, finalElevationMap, placeholderBiome, log, prng);

    // 6. Determine climate and assign final biomes to land tiles.
    const { moistureMap } = this._generateClimateAndBiomes(map, options, placeholderBiome, log, prng);

    // 7. Add detail features like hills.
    this._generateHills(map, finalElevationMap, prng);

    // 8. Generate rivers.
    this._generateRivers(map, log, prng);

    // 9. Run final post-processing passes to clean up the map.
    this._runPostProcessingPasses(map, placeholderBiome, prng);

    // 10. Add special features like Oases that depend on the final map state.
    this._generateOases(map, finalElevationMap, prng);

    // 11. Add forests based on the finalized map state (climate and hydrology).
    this._generateForests(map, moistureMap, prng);

    // 12. Place resources on the now-finalized map.
    this._generateResources(map, log, prng);

    // --- Final Log Summary ---
    const totalTiles = map.width * map.height;
    const oceanTiles = map.grid.flat().filter(tile => tile.biome.id === BiomeLibrary.OCEAN.id).length;
    const oceanPercentage = ((oceanTiles / totalTiles) * 100).toFixed(1);
    log.push(`Final map composition: ${oceanTiles} ocean tiles (${oceanPercentage}% of total).`);

    return log;
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
  static _applyEdgeControl(elevationMap, width, height, log, prng) {
    const modifiedMap = [];
    const numEdges = prng() < 0.5 ? 1 : 2; // 50% chance for 1 or 2 low edges
    const edges = ['top', 'bottom', 'left', 'right'];

    // Shuffle edges to pick random ones
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    const lowEdges = edges.slice(0, numEdges);
    log.push(`Lowering edges: ${lowEdges.join(', ')}`);

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
   * @param {string[]} log The log array to push messages to.
   * @private
   */
  static _generateMountains(map, elevationMap, placeholderBiome, log, prng) {
    const config = Config.MapGeneratorConfig.mountains;

    const allLandTiles = this._getLandTiles(map);
    // This set will track all mountains placed across all ranges to detect convergence.
    const allMountainCoords = new Set();

    if (allLandTiles.length < config.minLandTiles) return;

    const coastalCoords = new Set();
    const inlandTiles = [];
    const coastalTiles = [];
    for (const tile of allLandTiles) {
      // Forbid chains starting on the absolute edge of the map.
      const isEdge = tile.x === 0 || tile.x === map.width - 1 || tile.y === 0 || tile.y === map.height - 1;
      if (isEdge) continue;

      const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
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

    const numRanges = Math.floor(prng() * (config.numRanges.max - config.numRanges.min + 1)) + config.numRanges.min;

    for (let i = 0; i < numRanges; i++) {
      const targetLength = config.rangeLengths[Math.floor(prng() * config.rangeLengths.length)];

      const startInland = prng() < config.inlandStartChance;
      let startTilePool = (startInland && inlandTiles.length > 0) ? inlandTiles : coastalTiles;
      if (startTilePool.length === 0) startTilePool = inlandTiles.length > 0 ? inlandTiles : coastalTiles;
      if (startTilePool.length === 0) continue; // No valid start tiles

      let currentTile = startTilePool[Math.floor(prng() * startTilePool.length)];
      if (!currentTile || currentTile.biome.id !== placeholderBiome.id) continue;

      let direction = Math.floor(prng() * 6);
      const startTile = currentTile;
      const currentRangeTiles = new Set();

      for (let j = 0; j < targetLength; j++) {
        if (!currentTile || currentTile.biome.id !== placeholderBiome.id) break;

        currentTile.biome = BiomeLibrary.MOUNTAIN;
        const currentKey = `${currentTile.x},${currentTile.y}`;
        currentRangeTiles.add(currentKey);
        allMountainCoords.add(currentKey);

        // NEW RULE: After placing a mountain, check if it connects to another range.
        const neighborsOfCurrent = HexGridUtils.getNeighbors(currentTile.x, currentTile.y);
        const touchesOtherMountain = neighborsOfCurrent.some(c => {
          const key = `${c.x},${c.y}`;
          return allMountainCoords.has(key) && !currentRangeTiles.has(key);
        });
        if (touchesOtherMountain) {
          break; // Stop extending this range as it has converged.
        }

        // Create a "bulge" in the mountain range.
        if (prng() < config.bulgeChance) {
          const neighbors = HexGridUtils.getNeighbors(currentTile.x, currentTile.y);
          const randomNeighborCoords = neighbors[Math.floor(prng() * neighbors.length)];
          const bulgeTile = map.getTileAt(randomNeighborCoords.x, randomNeighborCoords.y);
          const bulgeTouchesOther = HexGridUtils.getNeighbors(randomNeighborCoords.x, randomNeighborCoords.y).some(c => {
            const key = `${c.x},${c.y}`;
            return allMountainCoords.has(key) && !currentRangeTiles.has(key);
          });
          if (bulgeTile?.biome.id === placeholderBiome.id && !bulgeTouchesOther) {
            bulgeTile.biome = BiomeLibrary.MOUNTAIN;
          }
        }

        // --- New Direction Selection Logic ---
        const allNeighbors = HexGridUtils.getNeighbors(currentTile.x, currentTile.y);
        const forwardDirections = [(direction - 1 + 6) % 6, direction, (direction + 1) % 6];

        // Calculate the overall vector from the start of the range to the current tile.
        const startCube = HexGridUtils.offsetToCube(startTile.x, startTile.y);
        const currentCube = HexGridUtils.offsetToCube(currentTile.x, currentTile.y);
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
            const nextCube = HexGridUtils.offsetToCube(coord.x, coord.y);
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

        const choice = this._getWeightedRandomChoice(weightedChoices, prng);
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
    const numPeaksToPlace = Math.ceil(plainsWithElevation.length * config.lonePeakPercentage);
    let peaksPlaced = 0;

    for (const candidate of plainsWithElevation) {
      if (peaksPlaced >= numPeaksToPlace) break;

      const tile = candidate.tile;

      // Rule: Forbid placing lone peaks on the absolute edge of the map.
      const isEdge = tile.x === 0 || tile.x === map.width - 1 || tile.y === 0 || tile.y === map.height - 1;
      if (isEdge) continue;

      // Rule: Forbid placing lone peaks adjacent to any existing mountain.
      const isAdjacentToMountain = HexGridUtils.getNeighbors(tile.x, tile.y).some(c =>
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
   * Selects a random item from a list of choices, where each choice has a weight.
   * @param {Array<object>} choices An array of objects, each with a 'weight' property.
   * @returns {object|null} The selected choice object, or null if no choices are available.
   * @private
   */
  static _getWeightedRandomChoice(choices, prng) {
    if (!choices || choices.length === 0) return null;

    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    if (totalWeight <= 0) return choices[0]; // Fallback if all weights are zero

    let random = prng() * totalWeight;

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
  static _generateClimateAndBiomes(map, options, placeholderBiome, log, prng) {
    const config = Config.MapGeneratorConfig.climate;

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

        const isCoastal = HexGridUtils.getNeighbors(x, y).some(c => map.getTileAt(c.x, c.y)?.biome.id === BiomeLibrary.OCEAN.id);
        if (isCoastal) {
          // Positive value warms the north, negative value cools the south.
          const baseTemp = baseTemperatureMap[y][x];
          moderationMap[y][x] = config.coastalModeration * (0.5 - baseTemp) * 2;
        }
      }
    }

    // --- 3. Blur/Diffuse the Moderation Map to bleed the effect inland ---
    for (let pass = 0; pass < config.moderationBlurPasses; pass++) {
      const nextModerationMap = Array.from({ length: map.height }, () => Array(map.width).fill(0));
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const neighbors = HexGridUtils.getNeighbors(x, y);
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
    const moistureNoise2D = createNoise2D(prng);
    const moistureMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const noiseValue = moistureNoise2D(x * config.moistureNoiseScale, y * config.moistureNoiseScale);
        row.push((noiseValue + 1) / 2); // Normalize to 0-1
      }
      moistureMap.push(row);
    }

    // --- 6. Apply Rain Shadow based on a global wind vector ---
    const windVector = this._getWindVector(map, log);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.getTileAt(x, y).biome.id === BiomeLibrary.OCEAN.id) continue;

        // Trace a line against the wind to see if we hit a mountain
        let currentX = x;
        let currentY = y;
        for (let i = 0; i < config.rainShadowDistance; i++) {
          // Move against the wind
          currentX -= windVector.dx;
          currentY -= windVector.dy;

          const roundedX = Math.round(currentX);
          const roundedY = Math.round(currentY);

          const tile = map.getTileAt(roundedX, roundedY);
          if (tile && tile.biome.id === BiomeLibrary.MOUNTAIN.id) {
            // We are in a rain shadow. Reduce moisture.
            const shadowFactor = 1.0 - (i / config.rainShadowDistance); // Fades with distance
            const moistureReduction = config.rainShadowStrength * shadowFactor;
            moistureMap[y][x] = Math.max(0, moistureMap[y][x] - moistureReduction);
            break; // Stop tracing once a mountain is found
          }
        }
      }
    }

    // --- 7. Generate Biome Noise Map for tie-breaking ---
    const biomeNoise2D = createNoise2D(prng);
    const biomeNoiseMap = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        const noiseValue = biomeNoise2D(x * config.biomeNoiseScale, y * config.biomeNoiseScale);
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
    for (let y = 0; y < config.iceMaxRow; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);
        if (tile.biome.id === BiomeLibrary.OCEAN.id && finalTemperatureMap[y][x] < config.iceTempThreshold) {
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
    const allTiles = map.grid.flat(); // All tiles on the map.
    const tundraTiles = allTiles.filter(t => t.biome.id === BiomeLibrary.TUNDRA.id); // All tundra tiles.
    const desertTiles = allTiles.filter(t => t.biome.id === BiomeLibrary.DESERT.id); // All desert tiles.
    const topTenPercentRow = Math.floor(map.height * 0.1); // Row cutoff for "northern" tiles.

    // Rule 1: Check for deserts too close to tundra
    if (tundraTiles.length > 0 && desertTiles.length > 0) {
      for (const desert of desertTiles) {
        const desertCube = HexGridUtils.offsetToCube(desert.x, desert.y);
        let tooClose = false;
        for (const tundra of tundraTiles) {
          const tundraCube = HexGridUtils.offsetToCube(tundra.x, tundra.y);
          if (HexGridUtils.getCubeDistance(desertCube, tundraCube) <= 3) {
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
      const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
      let steppeNeighbors = 0; // Changed from savannahNeighbors
      let plainsNeighbors = 0; // Changed from grasslandNeighbors

      for (const coord of neighbors) {
        const neighbor = map.getTileAt(coord.x, coord.y);
        if (neighbor?.biome.isBuildable) {
          if (neighbor.biome.id === placeholderBiome.id) steppeNeighbors++; // Changed from savannahNeighbors
          if (neighbor.biome.id === BiomeLibrary.PLAINS.id) plainsNeighbors++; // Changed from grasslandNeighbors
        }
      }
      // Convert to the most common valid neighbor. Tie goes to plains.
      tile.biome = (plainsNeighbors >= steppeNeighbors) ? BiomeLibrary.PLAINS : placeholderBiome;
    }
  }

  /**
   * Runs a series of post-processing passes to clean up the map and enforce rules.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _runPostProcessingPasses(map, placeholderBiome, prng) {
    // Pass 1: Fix problematic biome placements (the original logic).
    this._fixProblematicBiomes(map, placeholderBiome);

    // Pass 2: Smooth out isolated "island" biomes based on their neighbors.
    this._smoothBiomeIslands(map);

    // Pass 3: Convert small, land-locked oceans into lakes.
    this._convertInlandSeasToLakes(map);

    // Pass 4: Clean up any features that might be on new lake tiles.
    this._removeFeaturesFromLakes(map);

    // Pass 5: Final sanity check to remove any lakes with rivers on their edges.
    this._cleanupInvalidLakes(map, placeholderBiome, prng);
  }

  /**
   * Places forests on the map based on moisture and biome type.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} moistureMap The final moisture map data.
   * @private
   */
  static _generateForests(map, moistureMap, prng) {
    const forestConfig = Config.MapGeneratorConfig.forests;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTileAt(x, y);

        // Skip if the tile cannot support features or already has one, or is water.
        if (!tile.biome.canSupportFeatures || tile.feature || tile.biome.id === BiomeLibrary.OCEAN.id || tile.biome.id === BiomeLibrary.LAKE.id) continue;

        let forestChance = moistureMap[y][x]; // Start with the base moisture value
        const biomeId = tile.biome.id;
        const rulesForBiome = forestConfig.biomeRules[biomeId] || forestConfig.biomeRules.default;

        // Iterate through the rules for this biome and apply the first one that matches.
        for (const rule of rulesForBiome) {
          if (!rule.conditions || this._checkConditions(tile, rule.conditions, map)) {
            if (rule.multiplier !== undefined) {
              forestChance *= rule.multiplier;
            }
            if (rule.boost !== undefined) {
              forestChance = Math.min(1, forestChance + rule.boost); // Ensure boost doesn't exceed 1.0
            }
            break; // Apply only the first matching rule.
          }
        }

        // Apply the chance to place a forest.
        if (prng() < forestChance) {
          // If it passes the random check, place a forest.
          tile.feature = FeatureLibrary.FOREST;
        }
        // Otherwise, it remains as the base biome.
        else {
          // If a forest is not placed, this tile will remain its base biome
          // This else block is intentionally left empty for clarity.
        }
      }
    }
  }

  /**
   * Places Oasis features on the map according to specific rules.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} finalElevationMap The final elevation map data.
   * @private
   */
  static _generateOases(map, finalElevationMap, prng) {
    // Get all desert tiles to determine the elevation threshold within deserts only.
    const desertTiles = map.grid.flat().filter(tile => tile.biome.id === BiomeLibrary.DESERT.id);
    if (desertTiles.length === 0) return;

    // Determine the elevation threshold for what counts as "low-lying".
    // We'll consider the bottom 20% of desert elevations as low.
    const desertElevations = desertTiles.map(tile => finalElevationMap[tile.y][tile.x]).sort((a, b) => a - b);
    const lowElevationThreshold = desertElevations[Math.min(desertElevations.length - 1, Math.floor(desertElevations.length * Config.MapGeneratorConfig.oasisLowElevationThreshold))];
    const oasisSpawnChance = Config.MapGeneratorConfig.oasisSpawnChance;

    for (const tile of map.grid.flat()) {
      // --- Filter for candidate tiles ---
      // Rule: Must be a desert tile.
      if (tile.biome.id !== BiomeLibrary.DESERT.id) continue;
      // Rule: Must not already have a feature.
      if (tile.feature) continue;
      // Rule: Must be a low-elevation tile.
      if (finalElevationMap[tile.y][tile.x] > lowElevationThreshold) continue;

      // --- Check adjacency rules ---
      // Rule: Must not be adjacent to a major water body (Ocean or Lake).
      const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
      const isNextToMajorWater = neighbors.some(n => n.biome.id === BiomeLibrary.OCEAN.id || n.biome.id === BiomeLibrary.LAKE.id);
      if (isNextToMajorWater) continue;

      // Rule: Must not have a river flowing along its edge.
      const vertices = HexGridUtils.getVerticesForTile(tile, map);
      let hasRiver = false;
      for (let i = 0; i < vertices.length; i++) {
        const edgeId = HexGridUtils.getEdgeId(vertices[i], vertices[(i + 1) % vertices.length]);
        if (map.rivers.has(edgeId)) {
          hasRiver = true;
          break;
        }
      }
      if (hasRiver) continue;

      // If all rules pass, roll the dice for a chance to spawn.
      const isNextToOasis = neighbors.some(n => n.feature?.id === FeatureLibrary.OASIS.id);
      if (isNextToOasis) {
        continue;
      }

      if (prng() < oasisSpawnChance) {
        tile.feature = FeatureLibrary.OASIS;
      }
    }
  }

  /**
   * The main method for the Erosion and Detail Phase. Places hills on the map.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {number[][]} elevationMap The final elevation map, used to place isolated hills.
   * @private
   */
  static _generateHills(map, elevationMap, prng) {
    const config = Config.MapGeneratorConfig.hills;

    // --- Proximity-Based Hills (Foothills) ---
    const queue = [];
    const visited = new Set();
    const allLandTiles = this._getLandTiles(map);

    // 1. Initialize the queue with all valid tiles directly adjacent to mountains.
    for (const tile of allLandTiles) {
      if (tile.biome.id === BiomeLibrary.MOUNTAIN.id) {
        const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
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

      const chance = config.adjacentToMountainChance - (distance - 1) * config.distanceFalloff;

      if (prng() < chance) {
        tile.feature = FeatureLibrary.HILLS;

        // If a hill is placed, add its neighbors to the queue to continue the spread.
        const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
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

      if (elevationMap[tile.y][tile.x] < config.isolatedHillElevationThreshold) continue;

      // Ensure it's not adjacent to a mountain to keep it truly isolated.
      const isAdjacentToMountain = HexGridUtils.getNeighbors(tile.x, tile.y).some(c => map.getTileAt(c.x, c.y)?.biome.id === BiomeLibrary.MOUNTAIN.id);
      if (!isAdjacentToMountain && prng() < config.isolatedHillChance) {
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
  static _getWindVector(map, log) {
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
    log.push(`Prevailing wind from: ${wettestEdge}`);

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
      for (const coord of HexGridUtils.getNeighbors(tile.x, tile.y)) {
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
          for (const coord of HexGridUtils.getNeighbors(currentTile.x, currentTile.y)) {
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

  /**
   * The main method for the Hydrology Phase. Generates rivers on the map.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {string[]} log The log array to push messages to.
   * @private
   */
  static _generateRivers(map, log, prng) {
    const config = Config.MapGeneratorConfig.rivers;

    // 1. Identify all potential source tiles on the map.
    const potentialSources = [];
    for (const tile of this._getLandTiles(map)) {
      let weight = 0;
      if (tile.biome.id === BiomeLibrary.MOUNTAIN.id) {
        weight = config.sourceWeights.mountain;
      } else if (tile.biome.id === BiomeLibrary.ICE.id) {
        weight = config.sourceWeights.ice;
      } else if (tile.feature?.id === FeatureLibrary.HILLS.id) {
        weight = config.sourceWeights.hills;
      }

      if (weight > 0) {
        potentialSources.push({ tile, weight });
      }
    }

    if (potentialSources.length === 0) return;

    // 2. Determine how many rivers to generate.
    const numRiversToGenerate = Math.floor(prng() * (config.numRivers.max - config.numRivers.min + 1)) + config.numRivers.min;
    log.push(`--- Attempting to generate ${numRiversToGenerate} Rivers ---`);

    let riversGenerated = 0;
    while (riversGenerated < numRiversToGenerate && potentialSources.length > 0) {
      let riverIsValid = false;
      for (let attempt = 0; attempt < config.maxAttemptsPerRiver; attempt++) {
        if (potentialSources.length === 0) break; // No more sources to try

        const sourceChoice = this._getWeightedRandomChoice(potentialSources, prng);
        if (!sourceChoice) continue;

        const sourceTile = sourceChoice.tile;
        const sourceIndex = potentialSources.indexOf(sourceChoice);

        const vertices = HexGridUtils.getVerticesForTile(sourceTile, map);
        if (vertices.length === 0) {
          if (sourceIndex > -1) potentialSources.splice(sourceIndex, 1);
          continue; // This source is unusable, try again.
        }

        const startVertex = vertices[Math.floor(prng() * vertices.length)];
        const { path: riverPath, endVertex, formedLakeAt } = this._findRiverPathFromSource(startVertex, map, map.rivers);

        // --- New Validation: Check if the river ends too close to its source ---
        let endsTooClose = false;
        // A river path of length 0 or 1 is already caught by minLength. This check is for longer paths that loop back.
        if (riverPath.length > 1) {
          const sourceCube = HexGridUtils.offsetToCube(sourceTile.x, sourceTile.y);
          const endTiles = HexGridUtils.getTilesForVertex(endVertex).map(c => map.getTileAt(c.x, c.y));
          for (const tile of endTiles) {
            if (tile) {
              const endCube = HexGridUtils.offsetToCube(tile.x, tile.y);
              if (HexGridUtils.getCubeDistance(sourceCube, endCube) <= 1) {
                endsTooClose = true;
                break;
              }
            }
          }
        }

        if (riverPath.length >= config.minLength && !endsTooClose) {
          if (formedLakeAt) {
            log.push(`River from (${sourceTile.x}, ${sourceTile.y}) is valid with length ${riverPath.length}, forming a lake at (${formedLakeAt.x}, ${formedLakeAt.y}).`);
            const lakeTile = map.getTileAt(formedLakeAt.x, formedLakeAt.y);
            if (lakeTile) {
              // The river is valid, so now we can safely create the lake.
              lakeTile.biome = BiomeLibrary.LAKE;
            }
          } else {
            log.push(`River from (${sourceTile.x}, ${sourceTile.y}) is valid with length ${riverPath.length}.`);
          }

          for (const edgeId of riverPath) {
            map.rivers.add(edgeId);
          }
          riverIsValid = true;
          break; // Success, break from the attempt loop.
        } else {
          // River is too short, remove this source from the pool and try another.
          if (sourceIndex > -1) {
            potentialSources.splice(sourceIndex, 1);
          }
        }
      }

      if (riverIsValid) {
        riversGenerated++;
      }
    }
  }

  /**
   * Calculates the effective elevation of a single tile, considering its biome and features.
   * @param {import('./HexTile.js').default} tile The tile to evaluate.
   * @returns {number} The effective elevation.
   * @private
   */
  static _getTileEffectiveElevation(tile) {
    if (!tile) return -Infinity; // Treat off-map as infinitely low.
    const biomeElevation = tile.biome.elevation ?? 0;
    const featureModifier = tile.feature?.elevationModifier ?? 0;
    return biomeElevation + featureModifier;
  }

  /**
   * Calculates the elevation of a vertex by averaging the elevation of its 3 surrounding tiles.
   * @param {string} vertexId The unique ID of the vertex.
   * @param {import('./Map.js').default} map The map object.
   * @returns {number} The calculated elevation of the vertex.
   * @private
   */
  static _getVertexElevation(vertexId, map) {
    const tileCoords = HexGridUtils.getTilesForVertex(vertexId);
    let totalElevation = 0;
    for (const coord of tileCoords) {
      const tile = map.getTileAt(coord.x, coord.y);
      totalElevation += this._getTileEffectiveElevation(tile);
    }
    return totalElevation / tileCoords.length;
  }

  /**
   * Entry point for creating a single river path. It sets up the initial state
   * and calls the recursive exploration method.
   * @param {string} startVertex The ID of the vertex where the river begins.
   * @param {import('./Map.js').default} map The map object.
   * @param {Set<string>} existingRivers A set of edge IDs for already generated rivers.
   * @returns {{path: string[], endVertex: string, formedLakeAt: {x: number, y: number}|null}} The generated path, its final vertex, and any potential lake.
   * @private
   */
  static _findRiverPathFromSource(startVertex, map, existingRivers) {
    const visitedVertices = new Set([startVertex]);
    const riverEdgeCountsByTile = new Map();
    const maxDepth = Config.MapGeneratorConfig.rivers.maxDepth;

    const result = this._exploreRiverPath(startVertex, null, visitedVertices, riverEdgeCountsByTile, map, existingRivers, maxDepth);

    return {
      path: result.path || [],
      endVertex: result.endVertex || startVertex,
      formedLakeAt: result.formedLakeAt || null,
    };
  }

  /**
   * Recursively explores paths for a river using backtracking.
   * @returns {{success: boolean, path: string[], endVertex: string, formedLakeAt: {x: number, y: number}|null}}
   * @private
   */
  static _exploreRiverPath(currentVertex, previousVertex, visitedVertices, riverEdgeCountsByTile, map, existingRivers, depth) {
    if (depth <= 0) return { success: false }; // Reached max recursion depth

    // --- Base Case: Successful Termination ---
    const surroundingTiles = HexGridUtils.getTilesForVertex(currentVertex).map(c => map.getTileAt(c.x, c.y));
    if (surroundingTiles.some(t => t?.biome.id === BiomeLibrary.OCEAN.id)) {
      return { success: true, path: [], endVertex: currentVertex };
    }

    // --- Candidate Selection ---
    const candidates = this._getWeightedNeighborCandidates(currentVertex, previousVertex, visitedVertices, riverEdgeCountsByTile, map);
    if (candidates.length === 0) {
      // This vertex is a dead end from this direction, try to form a lake.
      return this._attemptLakeFormation(currentVertex, previousVertex, map);
    }

    // --- Recursive Backtracking ---
    for (const choice of candidates) {
      const nextVertex = choice.vertex;
      const edgeId = HexGridUtils.getEdgeId(currentVertex, nextVertex);

      // Check for termination by merging or entering a lake
      if (existingRivers.has(edgeId)) continue; // This path is blocked by another river.

      const lakeInteractionResult = this._handleLakeInteraction(edgeId, nextVertex, visitedVertices, map);
      if (lakeInteractionResult) {
        if (lakeInteractionResult.shouldTerminate) {
          return { success: true, path: [edgeId], endVertex: nextVertex };
        }
        if (lakeInteractionResult.shouldContinueFrom) {
          const pathSegment = [edgeId];
          visitedVertices.add(lakeInteractionResult.shouldContinueFrom);
          const subResult = this._exploreRiverPath(lakeInteractionResult.shouldContinueFrom, nextVertex, visitedVertices, riverEdgeCountsByTile, map, existingRivers, depth - 1);
          if (subResult.success) {
            return { success: true, path: pathSegment.concat(subResult.path), endVertex: subResult.endVertex };
          }
          // Backtrack: if the path after the lake fails, we can't use this lake crossing.
          visitedVertices.delete(lakeInteractionResult.shouldContinueFrom);
          continue; // Try the next candidate instead of this lake path.
        }
      }

      // Explore the path
      visitedVertices.add(nextVertex);
      this._updateEdgeCounts(edgeId, riverEdgeCountsByTile, map, 1);
      const result = this._exploreRiverPath(nextVertex, currentVertex, visitedVertices, riverEdgeCountsByTile, map, existingRivers, depth - 1);

      if (result.success) {
        // Path was successful, prepend our edge and pass it up.
        result.path.unshift(edgeId);
        return result;
      } else {
        // Path failed, backtrack.
        visitedVertices.delete(nextVertex);
        this._updateEdgeCounts(edgeId, riverEdgeCountsByTile, map, -1);
      }
    }

    // All candidates from this vertex led to dead ends. Try to form a lake as a last resort.
    return this._attemptLakeFormation(currentVertex, previousVertex, map);
  }

  /**
   * Gathers and weights all valid neighbor vertices for the river to flow to.
   * @private
   */
  static _getWeightedNeighborCandidates(currentVertex, previousVertex, visitedVertices, riverEdgeCountsByTile, map) {
    const candidates = [];
    const currentElevation = this._getVertexElevation(currentVertex, map);
    const neighborVertices = this._getNeighborVertices(currentVertex, map);

    // --- U-Turn Heuristic: Get incoming vector ---
    let incomingVector = null;
    if (previousVertex) {
      const prevCenter = HexGridUtils.getVertexCenterCube(previousVertex, map);
      const currentCenter = HexGridUtils.getVertexCenterCube(currentVertex, map);
      if (prevCenter && currentCenter) {
        incomingVector = { q: currentCenter.q - prevCenter.q, r: currentCenter.r - prevCenter.r };
      }
    }

    for (const neighbor of neighborVertices) {
      if (visitedVertices.has(neighbor)) continue;

      const neighborElevation = this._getVertexElevation(neighbor, map);
      if (neighborElevation > currentElevation) continue; // Must be downhill or flat

      const elevationDrop = currentElevation - neighborElevation;
      let weight = 1.0 + elevationDrop * 10.0;

      // --- Hex-wrapping penalty ---
      const tempEdgeId = HexGridUtils.getEdgeId(currentVertex, neighbor);
      const borderedTiles = this._getTilesForEdge(tempEdgeId, map);

      // --- Refined Lake Interaction Heuristic ---
      const isNextEdgeOnShore = borderedTiles.some(t => t?.biome.id === BiomeLibrary.LAKE.id);
      if (isNextEdgeOnShore) {
        const currentVertexTiles = HexGridUtils.getTilesForVertex(currentVertex).map(c => map.getTileAt(c.x, c.y));
        const isCurrentVertexOnShore = currentVertexTiles.some(t => t?.biome.id === BiomeLibrary.LAKE.id);

        if (isCurrentVertexOnShore) {
          // This move continues along the shore of a lake we're already next to. Forbid it.
          continue;
        } else {
          // This move is entering the lake's area for the first time. Encourage it.
          weight *= 5.0;
        }
      }
      for (const tile of borderedTiles) {
        const tileId = `${tile.x},${tile.y}`;
        const currentCount = riverEdgeCountsByTile.get(tileId) || 0;
        if (currentCount + 1 >= 5) {
          weight *= 0.01; // Heavily penalize wrapping
        }
      }

      // --- U-Turn Heuristic: Apply penalty ---
      if (incomingVector) {
        const currentCenter = HexGridUtils.getVertexCenterCube(currentVertex, map);
        const neighborCenter = HexGridUtils.getVertexCenterCube(neighbor, map);
        if (currentCenter && neighborCenter) {
          const outgoingVector = { q: neighborCenter.q - currentCenter.q, r: neighborCenter.r - currentCenter.r };
          const dotProduct = incomingVector.q * outgoingVector.q + incomingVector.r * outgoingVector.r;
          if (dotProduct < 0) weight *= 0.1; // Penalize sharp turns
        }
      }
      candidates.push({ vertex: neighbor, weight: weight });
    }

    // Sort candidates by weight to try the best paths first in the recursive search.
    candidates.sort((a, b) => b.weight - a.weight);
    return candidates;
  }

  /**
   * Attempts to form a lake when a river path is stuck.
   * @returns {{success: boolean, path: string[], endVertex: string, formedLakeAt: {x: number, y: number}}|{success: boolean}}
   * @private
   */
  static _attemptLakeFormation(currentVertex, previousVertex, map) {
    if (!previousVertex) return { success: false }; // Cannot form a lake at the source.

    const currentTileCoords = HexGridUtils.getTilesForVertex(currentVertex);
    const previousTileSet = new Set(HexGridUtils.getTilesForVertex(previousVertex).map(c => `${c.x},${c.y}`));
    const forwardTileCoord = currentTileCoords.find(c => !previousTileSet.has(`${c.x},${c.y}`));

    if (forwardTileCoord) {
      const forwardTile = map.getTileAt(forwardTileCoord.x, forwardTileCoord.y);
      const canFlood = forwardTile &&
                       forwardTile.biome.id !== BiomeLibrary.MOUNTAIN.id &&
                       forwardTile.biome.id !== BiomeLibrary.ICE.id &&
                       forwardTile.biome.id !== BiomeLibrary.OCEAN.id &&
                       forwardTile.biome.id !== BiomeLibrary.LAKE.id;

      if (canFlood) {
        // Instead of creating the lake, we signal where it *should* be created.
        // The lake will only be formed if the river path is validated.
        return {
          success: true,
          path: [],
          endVertex: currentVertex,
          formedLakeAt: { x: forwardTile.x, y: forwardTile.y },
        };
      }
    }
    // If no lake can be formed, this path is a failure.
    return { success: false };
  }

  /**
   * Handles the logic for a river flowing into an existing lake.
   * @returns {{shouldTerminate: boolean}|{shouldContinueFrom: string}|null}
   * @private
   */
  static _handleLakeInteraction(edgeId, nextVertex, visitedVertices, map) {
    const nextSurroundingTiles = HexGridUtils.getTilesForVertex(nextVertex).map(c => map.getTileAt(c.x, c.y));
    const lakeTile = nextSurroundingTiles.find(t => t?.biome.id === BiomeLibrary.LAKE.id);

    if (!lakeTile) return null; // Not a lake interaction.

    const desertNeighbors = HexGridUtils.getNeighbors(lakeTile.x, lakeTile.y)
      .map(c => map.getTileAt(c.x, c.y))
      .filter(t => t?.biome.id === BiomeLibrary.DESERT.id).length;

    // Rule: If a river enters a lake with 4+ desert neighbors, it terminates.
    if (desertNeighbors >= 4) {
      return { shouldTerminate: true };
    }

    // --- Flow-Through Logic ---
    const entryVertex = nextVertex;
    const exitVertex = this._findOppositeVertex(entryVertex, lakeTile, map);

    if (exitVertex && !visitedVertices.has(exitVertex)) {
      return { shouldContinueFrom: exitVertex };
    }

    // If there's no valid exit, the river terminates in the lake.
    return { shouldTerminate: true };
  }

  /**
   * Updates the count of river edges bordering a tile. Used for the hex-wrapping penalty.
   * @private
   */
  static _updateEdgeCounts(edgeId, riverEdgeCountsByTile, map, delta) {
    const borderedTiles = this._getTilesForEdge(edgeId, map);
    for (const tile of borderedTiles) {
      const tileId = `${tile.x},${tile.y}`;
      const currentCount = riverEdgeCountsByTile.get(tileId) || 0;
      riverEdgeCountsByTile.set(tileId, currentCount + delta);
    }
  }

  /**
   * Gets the three vertices that are adjacent to a given vertex.
   * @param {string} vertexId The ID of the vertex to find neighbors for.
   * @param {import('./Map.js').default} map The map object.
   * @returns {string[]} An array of neighbor vertex IDs.
   * @private
   */
  static _getNeighborVertices(vertexId, map) {
    const neighborVertices = new Set();
    const [t1, t2, t3] = HexGridUtils.getTilesForVertex(vertexId).map(c => map.getTileAt(c.x, c.y));

    if (!t1 || !t2 || !t3) return [];

    const findCommonNeighbor = (tileA, tileB, excludeTile) => {
      const neighborsA = HexGridUtils.getNeighbors(tileA.x, tileA.y).map(c => map.getTileAt(c.x, c.y));
      const neighborsBCoords = new Set(HexGridUtils.getNeighbors(tileB.x, tileB.y).map(c => `${c.x},${c.y}`));
      return neighborsA.find(n => n && n !== excludeTile && neighborsBCoords.has(`${n.x},${n.y}`));
    };

    // Find the vertex "opposite" each of the three defining tiles.
    const t4 = findCommonNeighbor(t2, t3, t1);
    const v2 = HexGridUtils.getVertexIdFromCoords(t2, t3, t4);
    if (v2) neighborVertices.add(v2);

    const t5 = findCommonNeighbor(t1, t3, t2);
    const v3 = HexGridUtils.getVertexIdFromCoords(t1, t3, t5);
    if (v3) neighborVertices.add(v3);

    const t6 = findCommonNeighbor(t1, t2, t3);
    const v4 = HexGridUtils.getVertexIdFromCoords(t1, t2, t6);
    if (v4) neighborVertices.add(v4);

    return Array.from(neighborVertices);
  }

  /**
   * Finds the vertex on the opposite side of a lake tile from an entry vertex.
   * @param {string} entryVertexId The vertex where the river enters the lake area.
   * @param {import('./HexTile.js').default} lakeTile The lake tile being crossed.
   * @param {import('./Map.js').default} map The map object.
   * @returns {string|null} The ID of the exit vertex, or null if none is found.
   * @private
   */
  static _findOppositeVertex(entryVertexId, lakeTile, map) {
    const entryCenter = HexGridUtils.getVertexCenterCube(entryVertexId, map);
    if (!entryCenter) return null;

    const lakeVertices = HexGridUtils.getVerticesForTile(lakeTile, map);
    let bestExitVertex = null;
    let maxDist = -1;

    for (const vertexId of lakeVertices) {
      const vertexCenter = HexGridUtils.getVertexCenterCube(vertexId, map);
      if (vertexCenter) {
        const dist = HexGridUtils.getCubeDistance(entryCenter, vertexCenter);
        if (dist > maxDist) {
          maxDist = dist;
          bestExitVertex = vertexId;
        }
      }
    }
    return bestExitVertex;
  }

  /**
   * Gets the two tiles that share a given edge.
   * @param {string} edgeId The ID of the edge.
   * @param {import('./Map.js').default} map The map object.
   * @returns {Array<import('./HexTile.js').default>} An array containing the two tiles that border the edge.
   * @private
   */
  static _getTilesForEdge(edgeId, map) {
    const [vertexId1, vertexId2] = HexGridUtils.getVerticesForEdge(edgeId);
    const v1TileCoords = HexGridUtils.getTilesForVertex(vertexId1);
    const v2TileCoordsSet = new Set(HexGridUtils.getTilesForVertex(vertexId2).map(c => `${c.x},${c.y}`));

    const commonCoords = v1TileCoords.filter(c => v2TileCoordsSet.has(`${c.x},${c.y}`));

    return commonCoords.map(c => map.getTileAt(c.x, c.y)).filter(t => t !== null);
  }

  /**
   * Removes any features (like forests or hills) from tiles that are lakes.
   * @param {import('./Map.js').default} map The map object to modify.
   * @private
   */
  static _removeFeaturesFromLakes(map) {
    for (const tile of map.grid.flat()) {
      if (tile.biome.id === BiomeLibrary.LAKE.id && tile.feature) {
        tile.feature = null;
      }
    }
  }

  /**
   * Finds any lakes with rivers on their edges and converts them to a valid land biome.
   * This is a final cleanup pass to fix any pathfinding artifacts.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {object} placeholderBiome The biome object used as the default land tile.
   * @private
   */
  static _cleanupInvalidLakes(map, placeholderBiome, prng) {
    const lakesToConvert = [];
    const lakeTiles = map.grid.flat().filter(t => t.biome.id === BiomeLibrary.LAKE.id);

    for (const lakeTile of lakeTiles) {
      const vertices = HexGridUtils.getVerticesForTile(lakeTile, map);
      if (vertices.length < 6) continue; // Should not happen on a valid map

      let hasRiverOnEdge = false;
      for (let i = 0; i < 6; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % 6];
        const edgeId = HexGridUtils.getEdgeId(v1, v2);
        if (map.rivers.has(edgeId)) {
          hasRiverOnEdge = true;
          break;
        }
      }

      if (hasRiverOnEdge) {
        lakesToConvert.push(lakeTile);
      }
    }

    if (lakesToConvert.length > 0) {
      for (const tile of lakesToConvert) {
        const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y);
        const biomeCounts = {};
        const validLandBiomes = new Set([
          BiomeLibrary.STEPPE.id, BiomeLibrary.PLAINS.id, BiomeLibrary.DESERT.id, BiomeLibrary.TUNDRA.id,
        ]);

        for (const coord of neighbors) {
          const neighbor = map.getTileAt(coord.x, coord.y);
          if (neighbor && validLandBiomes.has(neighbor.biome.id)) {
            const biomeId = neighbor.biome.id;
            biomeCounts[biomeId] = (biomeCounts[biomeId] || 0) + 1;
          }
        }

        if (Object.keys(biomeCounts).length > 0) {
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
          const chosenBiomeId = majorityBiomes[Math.floor(prng() * majorityBiomes.length)];
          const newBiome = Object.values(BiomeLibrary).find(b => b.id === chosenBiomeId);
          tile.biome = newBiome;
        } else {
          tile.biome = placeholderBiome;
        }
      }
    }
  }

  /**
   * Orchestrates the resource generation process using a "ranked candidate" model.
   * @param {import('./Map.js').default} map The map object to modify.
   * @param {string[]} log The log array to push messages to.
   * @private
   */
  static _generateResources(map, log, prng) {
    // 1. Determine how many of each resource to spawn.
    const targetCounts = this._determineResourceTargetCounts(prng);
    log.push(`Target resource counts: ${JSON.stringify(targetCounts)}`);

    // 2. Create and shuffle the master list of all resource instances to place.
    const masterPlacementList = [];
    for (const [resourceId, count] of Object.entries(targetCounts)) {
      for (let i = 0; i < count; i++) {
        masterPlacementList.push(resourceId);
      }
    }
    this._shuffleArray(masterPlacementList, prng);

    // 3. Loop through the shuffled list and place each instance.
    const finalResourceCounts = {};
    for (const resourceId of masterPlacementList) {
      const candidateTiers = this._getRankedCandidateTiers(resourceId, map);
      const placed = this._placeSingleResourceInstance(resourceId, candidateTiers, map, prng);
      if (placed) {
        finalResourceCounts[resourceId] = (finalResourceCounts[resourceId] || 0) + 1;
      }
    }

    // --- Final Logging ---
    const summary = Object.entries(finalResourceCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');

    if (summary) {
      log.push(`Final Resource Counts: ${summary}`);
    } else {
      log.push('No resources were placed on the map.');
    }
  }

  /**
   * Determines how many of each resource should be placed on the map.
   * For now, it returns a random number between 1 and 3 for each resource type.
   * @returns {Object.<string, number>} A map of resource IDs to their target counts.
   * @private
   */
  static _determineResourceTargetCounts(prng) {
    const counts = {};
    for (const key in ResourceLibrary) {
      const resourceId = ResourceLibrary[key].id;
      // For each resource, decide to spawn between 1 and 3 instances.
      counts[resourceId] = Math.floor(prng() * 3) + 1;
    }
    return counts;
  }

  /**
   * Shuffles an array in place using the Fisher-Yates algorithm.
   * @param {Array} array The array to shuffle.
   * @private
   */
  static _shuffleArray(array, prng) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Finds and ranks all possible spawn locations for a resource, grouping them into tiers.
   * This uses the "Best Match Wins" principle, where the first valid rule for a resource on a tile is chosen.
   * @param {string} resourceId The ID of the resource to find candidates for.
   * @param {import('./Map.js').default} map The map object.
   * @returns {object} An object containing tiered lists of candidate tiles.
   * @private
   */
  static _getRankedCandidateTiers(resourceId, map) {
    const candidates = [];

    for (const tile of map.grid.flat()) {
      // Get all rules that could apply to this tile.
      const applicableRules = this._getApplicableRulesForTile(tile);
      // Filter for rules matching the specific resource we're placing.
      const resourceRules = applicableRules.filter(r => r.resourceId === resourceId);

      // Find the single best rule for this resource on this tile.
      // This relies on rules being ordered from most to least specific in the library files.
      for (const rule of resourceRules) {
        if (this._checkConditions(tile, rule.conditions, map)) {
          // "Best Match Wins": we found the highest-priority valid rule.
          const score = rule.chance;
          candidates.push({ tile, score });
          break; // Stop checking other rules for this resource on this tile.
        }
      }
    }

    // Group the collected candidates into tiers based on their score.
    const tiers = { tier1: [], tier2: [], tier3: [] };
    for (const candidate of candidates) {
      if (candidate.score >= 0.4) {
        tiers.tier1.push(candidate.tile);
      } else if (candidate.score >= 0.1) {
        tiers.tier2.push(candidate.tile);
      } else {
        tiers.tier3.push(candidate.tile);
      }
    }

    return tiers;
  }

  /**
   * Attempts to place a single resource instance using the "Tiered Lottery" method.
   * @param {string} resourceId The ID of the resource to place.
   * @param {object} candidateTiers The tiered list of potential spawn locations.
   * @param {import('./Map.js').default} map The map object.
   * @returns {boolean} True if the resource was successfully placed, false otherwise.
   * @private
   */
  static _placeSingleResourceInstance(resourceId, candidateTiers, map, prng) {
    // Define the probabilities for selecting from each tier.
    const tierProbabilities = {
      tier1: 0.70, // 70% chance to pick from the best locations
      tier2: 0.25, // 25% chance to pick from good locations
      tier3: 0.05, // 5% chance to pick from acceptable locations
    };

    const rand = prng();
    let chosenTierName;

    if (rand < tierProbabilities.tier1) {
      chosenTierName = 'tier1';
    } else if (rand < tierProbabilities.tier1 + tierProbabilities.tier2) {
      chosenTierName = 'tier2';
    } else {
      chosenTierName = 'tier3';
    }

    // Fallback logic: if a higher tier is empty, try the next one down.
    const tierOrder = [chosenTierName, 'tier1', 'tier2', 'tier3'];
    const uniqueTierOrder = [...new Set(tierOrder)]; // Ensures we don't check a tier twice

    for (const tierName of uniqueTierOrder) {
      const candidates = candidateTiers[tierName];
      if (candidates && candidates.length > 0) {
        // Shuffle the chosen tier to randomize placement among equally-good candidates.
        this._shuffleArray(candidates, prng);

        for (const tile of candidates) {
          // Final validation: ensure the tile is still empty and not adjacent to another resource.
          if (!tile.contentType && !this._isAdjacentToResource(tile, map)) {            
            if (resourceId) {
              // Place a new instance of the Resource class.
              tile.setContent(new Resource(resourceId));
              return true; // Successfully placed.
            }
          }
        }
      }
    }

    // If no valid placement was found in any tier, return false.
    return false;
  }

  /**
   * Gets all resource placement rules that apply to a given tile,
   * respecting feature precedence and biome interactions.
   * @returns {object[]} An array of applicable rule objects.
   * @private
   */
  static _getApplicableRulesForTile(tile) {
    const finalRules = [];
    let biomeRules = tile.biome.possibleResources ? [...tile.biome.possibleResources] : [];

    if (tile.feature) {
      const featureRules = tile.feature.resourceOverrides?.[tile.biome.id]
        || tile.feature.possibleResources
        || [];
      finalRules.push(...featureRules);

      const interaction = tile.feature.biomeResourceInteraction;
      if (interaction?.mode === 'block') {
        if (interaction.resourceIds.includes('*')) {
          biomeRules = [];
        } else {
          const blockedIds = new Set(interaction.resourceIds);
          biomeRules = biomeRules.filter(rule => !blockedIds.has(rule.resourceId));
        }
      }
    }

    finalRules.push(...biomeRules);
    return finalRules;
  }

  /**
   * Checks if a tile is adjacent to another tile that already has a resource.
   * @returns {boolean} True if an adjacent resource is found.
   * @private
   */
  static _isAdjacentToResource(tile, map) {
    const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
    for (const neighbor of neighbors) {
      if (neighbor.contentType && !(neighbor.contentType instanceof Building)) {
        return true; // It has content, and it's not a building, so it must be a resource.
      }
    }
    return false;
  }

  /**
   * Checks if a tile meets a set of conditions for resource placement.
   * @param {import('./HexTile.js').default} tile The tile to check.
   * @param {Array<object>|undefined} conditions The array of condition objects.
   * @param {import('./Map.js').default} map The map object.
   * @returns {boolean} True if all conditions are met (or if there are no conditions).
   * @private
   */
  static _checkConditions(tile, conditions, map) {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      switch (condition.type) {
        case 'neighbor': {
          const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const matchCount = neighbors.filter(n => this._getPropertyByPath(n, condition.property) === condition.value).length;

          if (condition.operator === 'atLeast' && matchCount < condition.count) return false;
          // Other operators like 'exactly' or 'lessThan' could be added here.
          break;
        }
        case 'adjacentToRiver': {
          const vertices = HexGridUtils.getVerticesForTile(tile, map);
          let hasRiver = false;
          // Loop correctly over the actual number of vertices, which may be less than 6 for edge tiles.
          for (let i = 0; i < vertices.length; i++) {
            const edgeId = HexGridUtils.getEdgeId(vertices[i], vertices[(i + 1) % vertices.length]);
            if (map.rivers.has(edgeId)) {
              hasRiver = true;
              break;
            }
          }
          if (!hasRiver) return false;
          break;
        }
        case 'feature': {
          // Checks for the presence or absence of a feature, and can check for a specific feature ID.
          // e.g., { type: 'feature', id: 'hills' } or { type: 'feature', present: false }
          const shouldBePresent = condition.present !== false; // Defaults to true
          const actuallyHasFeature = !!tile.feature;

          if (shouldBePresent) {
            // We expect a feature to be present.
            if (!actuallyHasFeature) return false;
            // If an ID is specified, it must match.
            if (condition.id && tile.feature.id !== condition.id) return false;
          } else {
            // We expect no feature to be present.
            if (actuallyHasFeature) return false;
          }
          break;
        }
        case 'notAdjacentToResource': {
          // This ensures a tile is not a candidate if it's already next to a resource.
          if (this._isAdjacentToResource(tile, map)) return false;
          break;
        }
        case 'adjacentToWater': {
          const neighbors = HexGridUtils.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y)).filter(Boolean);
          const isNextToWaterBody = neighbors.some(n => n.biome.id === BiomeLibrary.LAKE.id || n.biome.id === BiomeLibrary.OCEAN.id || n.feature?.id === FeatureLibrary.OASIS.id);
          if (!isNextToWaterBody) return false; // Condition fails if not next to a water biome.
          break;
        }
      }
    }
    return true; // All conditions passed.
  }

  /**
   * Safely gets a nested property from an object using a string path.
   * @param {object} obj The object to query.
   * @param {string} path The path to the property (e.g., 'biome.isBuildable').
   * @returns {*} The property value or undefined if not found.
   * @private
   */
  static _getPropertyByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }
}