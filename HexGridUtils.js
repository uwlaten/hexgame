/**
 * @fileoverview Provides static utility functions for hexagonal grid calculations.
 * This centralizes complex grid geometry logic used by various parts of the application.
 */

export default class HexGridUtils {
  /**
   * Gets the coordinates of the 6 neighbors for a hex in an "odd-r" layout.
   * @param {number} x The x-coordinate of the hex.
   * @param {number} y The y-coordinate of the hex.
   * @returns {Array<{x: number, y: number}>} An array of neighbor coordinates.
   */
  static getNeighbors(x, y) {
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
   */
  static offsetToCube(x, y) {
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
   */
  static getCubeDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
  }

  /**
   * Creates a unique, sorted string ID for a vertex from three tiles.
   * @param {import('./HexTile.js').default} tile1 The first tile.
   * @param {import('./HexTile.js').default} tile2 The second tile.
   * @param {import('./HexTile.js').default} tile3 The third tile.
   * @returns {string|null} The unique vertex ID, or null if any tile is invalid.
   */
  static getVertexIdFromTiles(tile1, tile2, tile3) {
    if (!tile1 || !tile2 || !tile3) return null;
    const coords = [`${tile1.x},${tile1.y}`, `${tile2.x},${tile2.y}`, `${tile3.x},${tile3.y}`];
    coords.sort();
    return coords.join(';');
  }

  /**
   * Creates a unique, sorted string ID for an edge from two vertex IDs.
   * @param {string} vertexId1 The first vertex ID.
   * @param {string} vertexId2 The second vertex ID.
   * @returns {string} The unique edge ID.
   */
  static getEdgeId(vertexId1, vertexId2) {
    return [vertexId1, vertexId2].sort().join('--');
  }

  /**
   * Parses an edge ID string back into an array of two vertex IDs.
   * @param {string} edgeId The edge ID string.
   * @returns {string[]} An array of two vertex ID strings.
   */
  static getVerticesForEdge(edgeId) {
    return edgeId.split('--');
  }

  /**
   * Parses a vertex ID string back into an array of tile coordinates.
   * @param {string} vertexId The vertex ID string.
   * @returns {Array<{x: number, y: number}>} An array of three coordinate objects.
   */
  static getTilesForVertex(vertexId) {
    return vertexId.split(';').map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * Calculates the average cube coordinates for a vertex, giving its geometric center.
   * @param {string} vertexId The vertex ID string.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{q: number, r: number, s: number}|null} The center cube coordinates, or null if invalid.
   */
  static getVertexCenterCube(vertexId, map) {
    const tileCoords = this.getTilesForVertex(vertexId);
    if (tileCoords.length !== 3) return null;

    const cubes = tileCoords.map(c => this.offsetToCube(c.x, c.y));

    const center = {
      q: (cubes[0].q + cubes[1].q + cubes[2].q) / 3,
      r: (cubes[0].r + cubes[1].r + cubes[2].r) / 3,
      s: (cubes[0].s + cubes[1].s + cubes[2].s) / 3,
    };

    return center;
  }

  /**
   * Gets the 6 vertices that form the corners of a given tile.
   * @param {import('./HexTile.js').default} tile The tile to get vertices for.
   * @param {import('./Map.js').default} map The map object.
   * @returns {string[]} An array of 6 unique vertex IDs.
   */
  static getVerticesForTile(tile, map) {
    const vertices = new Set();
    const neighbors = this.getNeighbors(tile.x, tile.y).map(c => map.getTileAt(c.x, c.y));

    for (let i = 0; i < 6; i++) {
      const neighbor1 = neighbors[i];
      const neighbor2 = neighbors[(i + 1) % 6];
      const vertexId = this.getVertexIdFromTiles(tile, neighbor1, neighbor2);
      if (vertexId) vertices.add(vertexId);
    }

    return Array.from(vertices);
  }
}