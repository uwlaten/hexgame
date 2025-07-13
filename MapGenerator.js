/**
 * @fileoverview Defines the MapGenerator class for creating game maps.
 * This decouples the map generation logic from the Map data structure itself.
 */

import Config from './Config.js';
import HexTile from './HexTile.js';

/**
 * A utility class responsible for procedural map generation.
 * By using a static method, we can generate a map without needing to create
 * an instance of the generator itself, making it a lightweight helper.
 */
export default class MapGenerator {
  /**
   * Populates the provided map object's grid with HexTiles.
   * This method modifies the map object directly.
   * @param {Map} map The Map object to be populated.
   */
  static generate(map) {
    // Ensure the grid is empty before we start generating.
    map.grid = [];

    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) {
        // For this simple generator, we pick a random biome from the config list.
        const randomBiome = Config.biomes[Math.floor(Math.random() * Config.biomes.length)];

        // Create a new tile and add it to the current row.
        const tile = new HexTile(x, y, randomBiome);
        row.push(tile);
      }
      map.grid.push(row);
    }
  }
}