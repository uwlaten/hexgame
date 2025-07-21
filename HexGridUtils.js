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
   * @param {{x: number, y: number}} coord1 The first coordinate.
   * @param {{x: number, y: number}} coord2 The second coordinate.
   * @param {{x: number, y: number}} coord3 The third coordinate.
   * @returns {string|null} The unique vertex ID, or null if any tile is invalid.
   */
  static getVertexIdFromCoords(coord1, coord2, coord3) {
    if (!coord1 || !coord2 || !coord3) return null;
    const coords = [`${coord1.x},${coord1.y}`, `${coord2.x},${coord2.y}`, `${coord3.x},${coord3.y}`];
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
    const tileCoord = { x: tile.x, y: tile.y };
    const neighborCoords = this.getNeighbors(tile.x, tile.y);

    for (let i = 0; i < 6; i++) {
      const neighbor1Coord = neighborCoords[i];
      const neighbor2Coord = neighborCoords[(i + 1) % 6];
      const vertexId = this.getVertexIdFromCoords(tileCoord, neighbor1Coord, neighbor2Coord);
      if (vertexId) vertices.add(vertexId);
    }

    return Array.from(vertices);
  }

  /**
   * Calculates the outer perimeter of two adjacent tiles as an ordered list of vertex IDs.
   * This is used for drawing a continuous border around a linked building and resource.
   * @param {import('./HexTile.js').default} tileA The first tile.
   * @param {import('./HexTile.js').default} tileB The second, adjacent tile.
   * @param {import('./Map.js').default} map The map object.
   * @returns {string[]} An ordered array of vertex IDs forming the outer perimeter, or an empty array if tiles are not adjacent.
   */
  static getOuterPerimeter(tiles, map) {
    // --- Step 4: Collect all edges and find the unique outer ones ---
    const allEdges = tiles.flatMap(tile => this.getEdgesForTile(tile, map));

    const edgeCounts = new Map();
    for (const edgeId of allEdges) {
      edgeCounts.set(edgeId, (edgeCounts.get(edgeId) || 0) + 1);
    }

    const outerEdges = [];
    for (const [edgeId, count] of edgeCounts.entries()) {
      if (count === 1) {
        outerEdges.push(edgeId);
      }
    }

    // --- Step 5: Order the edges into a continuous path of vertices ---
    if (outerEdges.length === 0) {
      return [];
    }

    // 1. Build an adjacency list to represent the connections in the perimeter graph.
    const adjacencyList = new Map();
    for (const edgeId of outerEdges) {
      const [v1, v2] = this.getVerticesForEdge(edgeId);
      if (!adjacencyList.has(v1)) adjacencyList.set(v1, []);
      if (!adjacencyList.has(v2)) adjacencyList.set(v2, []);
      adjacencyList.get(v1).push(v2);
      adjacencyList.get(v2).push(v1);
    }

    // 2. Start the traversal from an arbitrary point.
    const path = [];
    const startVertex = outerEdges[0].split('--')[0];
    let previousVertex = null;
    let currentVertex = startVertex;

    // 3. Walk along the perimeter until all vertices are in the path.
    while (path.length < outerEdges.length) {
      path.push(currentVertex);
      const neighbors = adjacencyList.get(currentVertex);

      // Find the next vertex in the path that is not the one we just came from.
      const nextVertex = neighbors.find(v => v !== previousVertex);

      if (!nextVertex && path.length < outerEdges.length) {
        console.error("Perimeter path ordering failed: Path is broken.", { currentVertex, path, adjacencyList });
        return []; // Return empty to prevent rendering errors.
      }

      previousVertex = currentVertex;
      currentVertex = nextVertex;
    }
    return path;
  }

  /**
   * Gets the 6 edges that form the perimeter of a given tile.
   * @param {import('./HexTile.js').default} tile The tile to get edges for.
   * @param {import('./Map.js').default} map The map object.
   * @returns {string[]} An array of 6 unique edge IDs.
   */
  static getEdgesForTile(tile, map) {
    const vertices = this.getVerticesForTile(tile, map);
    const edges = [];
    // Loop to create edges between consecutive vertices.
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length]; // Wrap around to the first vertex at the end.
      const edgeId = this.getEdgeId(v1, v2);
      edges.push(edgeId);
    }
    return edges;
  }
}
