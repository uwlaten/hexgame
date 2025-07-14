/**
 * @fileoverview Defines the Renderer class for drawing the game state onto a canvas.
 */
import HexGridUtils from './HexGridUtils.js';
import DrawingUtils from './DrawingUtils.js';
import Config from './Config.js';
import HexTile from './HexTile.js';
import { Building } from './Building.js';
import { BuildingLibrary } from './BuildingLibrary.js';

/**
 * Handles all drawing operations on the HTML canvas.
 */
export default class Renderer {
  /**
   * Creates an instance of the Renderer.
   * @param {HTMLCanvasElement} canvas The canvas element to draw on.
   * @param {number} hexSize The size (radius) of a single hexagon tile from its center to a corner.
   */
  constructor(canvas, hexSize) {
    /**
     * The HTML canvas element.
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;

    /**
     * The 2D rendering context for the canvas.
     * @type {CanvasRenderingContext2D}
     */
    this.ctx = canvas.getContext('2d');

    /**
     * The size (radius) of a hexagon from its center to a corner.
     * @type {number}
     */
    this.hexSize = hexSize;

    /**
     * Padding around the map in pixels to prevent border clipping.
     * @type {number}
     * @private
     */
    this._padding = Config.RendererConfig.padding;
  }

  /**
   * Calculates the pixel coordinates of a tile's center.
   * @param {HexTile} tile The tile to calculate coordinates for.
   * @returns {{x: number, y: number}} The pixel coordinates of the tile's center.
   */
  tileToPixel(tile) {
    const cx = this.hexSize * Math.sqrt(3) * (tile.x + 0.5 * (tile.y & 1));
    const cy = this.hexSize * (3 / 2) * tile.y;
    return { x: cx, y: cy };
  }

  /**
   * Draws a single hexagonal tile on the canvas.
   * @param {HexTile} tile The HexTile object to draw.
   */
  drawHexTile(tile) {
    const { x: cx, y: cy } = this.tileToPixel(tile);

    const color = tile.biome.color || '#cccccc'; // Use the color from the biome object.

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // The angle for the first vertex is -90 degrees for a pointy-top hexagon,
      // which now matches our coordinate system.
      const angle_deg = 60 * i - 90;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const vx = cx + this.hexSize * Math.cos(angle_rad);
      const vy = cy + this.hexSize * Math.sin(angle_rad);
      if (i === 0) {
        this.ctx.moveTo(vx, vy);
      } else {
        this.ctx.lineTo(vx, vy);
      }
    }
    this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Add a border to each hex
    const borderStyle = Config.RendererConfig.hexBorderStyle;
    this.ctx.strokeStyle = borderStyle.strokeStyle;
    this.ctx.lineWidth = borderStyle.lineWidth;
    this.ctx.stroke();

    // If the biome itself has special drawing instructions (like waves on water), draw them.
    if (tile.biome.draw) {
      DrawingUtils.drawDetails(this.ctx, tile.biome, cx, cy, this.hexSize);
    }

    // If the tile has a feature (like hills), draw it on top of the biome.
    if (tile.feature?.draw) {
      DrawingUtils.drawDetails(this.ctx, tile.feature, cx, cy, this.hexSize);
    }

    // If the tile has content (like a building or resource), draw it.
    if (tile.contentType) {
      let definitionToDraw = null;
      if (tile.contentType instanceof Building) {
        // For Buildings, we look up the definition in the library.
        definitionToDraw = Object.values(BuildingLibrary).find(b => b.id === tile.contentType.type);
      } else {
        // For Resources, the contentType *is* the definition.
        definitionToDraw = tile.contentType;
      }

      // Use the drawing utility to render the icon for the building or resource.
      if (definitionToDraw?.draw) {
        DrawingUtils.drawDetails(this.ctx, definitionToDraw, cx, cy, this.hexSize);
      }
    }
  }

  /**
   * Calculates the required canvas dimensions to fit the entire map, including padding.
   * This makes the Renderer the single source of truth for layout calculations.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{width: number, height: number}} The required width and height in pixels.
   */
  getRequiredCanvasDimensions(map) {
    // Calculate the pixel dimensions of the hex grid itself.
    // This is for a "pointy-top, odd-r" layout.
    const mapPixelWidth = (map.width + 0.5) * this.hexSize * Math.sqrt(3);
    const mapPixelHeight = (1.5 * map.height + 0.5) * this.hexSize;

    // Add padding to both dimensions to ensure borders are not clipped.
    return {
      width: Math.ceil(mapPixelWidth + this._padding * 2),
      height: Math.ceil(mapPixelHeight + this._padding * 2),
    };
  }

  /**
   * Converts pixel coordinates from the canvas to hexagonal grid coordinates.
   * This implementation is based on the excellent guide from Red Blob Games.
   * @param {number} pixelX The x-coordinate of the click on the canvas.
   * @param {number} pixelY The y-coordinate of the click on the canvas.
   * @returns {{x: number, y: number}} The grid coordinates (column, row) of the hex.
   */
  pixelToHex(pixelX, pixelY) {
    // 1. Adjust for the canvas translation applied during rendering.
    const translateX = (this.hexSize * Math.sqrt(3)) / 2 + this._padding; 
    const translateY = this.hexSize + this._padding;
    const worldX = pixelX - translateX; 
    const worldY = pixelY - translateY;

    // 2. Convert world pixel coordinates to fractional axial coordinates (q, r).
    // This is for pointy-top hexes.
    const q = ((Math.sqrt(3) / 3) * worldX - (1 / 3) * worldY) / this.hexSize;
    const r = ((2 / 3) * worldY) / this.hexSize;

    // 3. Convert fractional axial to fractional cube coordinates (x, y, z).
    const x = q;
    const z = r;
    const y = -x - z;

    // 4. Round cube coordinates to the nearest integer hex.
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const x_diff = Math.abs(rx - x);
    const y_diff = Math.abs(ry - y);
    const z_diff = Math.abs(rz - z);

    if (x_diff > y_diff && x_diff > z_diff) {
      rx = -ry - rz;
    } else if (y_diff > z_diff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    // 5. Convert the rounded cube coordinates back to "odd-r" offset coordinates.
    const col = rx + (rz - (rz & 1)) / 2;
    const row = rz;

    return { x: col, y: row };
  }

  /**
   * Calculates the pixel coordinates of a vertex by averaging its surrounding tile centers.
   * @param {string} vertexId The unique ID of the vertex.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{x: number, y: number}|null} The pixel coordinates, or null if invalid.
   * @private
   */
  _getVertexPixelCoords(vertexId, map) {
    const tileCoords = HexGridUtils.getTilesForVertex(vertexId);
    if (tileCoords.length !== 3) return null;

    let totalX = 0;
    let totalY = 0;

    for (const coord of tileCoords) {
      const tile = map.getTileAt(coord.x, coord.y);
      if (!tile) return null; // Vertex is partially off-map

      const { x: px, y: py } = this.tileToPixel(tile);
      totalX += px;
      totalY += py;
    }

    return { x: totalX / 3, y: totalY / 3 };
  }

  /**
   * Draws all the rivers stored in the map's river data set.
   * @param {import('./Map.js').default} map The map object.
   * @private
   */
  _drawRivers(map) {
    if (map.rivers.size === 0) return;

    const riverStyle = Config.RendererConfig.riverStyle;
    this.ctx.strokeStyle = riverStyle.strokeStyle;
    this.ctx.lineWidth = riverStyle.lineWidth;
    this.ctx.lineCap = riverStyle.lineCap;
    this.ctx.lineJoin = riverStyle.lineJoin;

    for (const edgeId of map.rivers) {
      const [vertexId1, vertexId2] = HexGridUtils.getVerticesForEdge(edgeId);

      const p1 = this._getVertexPixelCoords(vertexId1, map);
      const p2 = this._getVertexPixelCoords(vertexId2, map);

      if (p1 && p2) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Clears the canvas and draws the entire map.
   * @param {import('./Map.js').default} map The map object to draw.
   */
  drawMap(map) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save the current context state (e.g., transformations)
    this.ctx.save();

    // Translate the context to center the map within the padded canvas.
    // The first part of the translation aligns the grid's geometric edge.
    // The padding part ensures the stroke is not clipped.
    this.ctx.translate(
      (this.hexSize * Math.sqrt(3)) / 2 + this._padding, 
      this.hexSize + this._padding
    );

    for (const row of map.grid) {
      for (const tile of row) {
        this.drawHexTile(tile);
      }
    }

    // Draw rivers on top of the tiles.
    this._drawRivers(map);

    // Restore the context to its original state
    this.ctx.restore();
  }
}