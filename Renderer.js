/**
 * @fileoverview Defines the Renderer class for drawing the game state onto a canvas.
 */

import HexTile from './HexTile.js';

/**
 * Handles all drawing operations on the HTML canvas.
 */
export default class Renderer {
  /**
   * A mapping of biome types to their corresponding colors for rendering.
   * @type {Object.<string, string>}
   */
  static biomeColors = {
    ocean: '#4f93a8',
    lake: '#63b4cf',
    mountain: '#808080',
    desert: '#d2b48c',
    grassland: '#98fb98',
    plains: '#f0e68c',
    tundra: '#f0f8ff',
    default: '#cccccc', // A default color for unknown biomes
  };

  /**
   * Creates an instance of the Renderer.
   * @param {HTMLCanvasElement} canvas The canvas element to draw on.
   * @param {number} hexSize The size (radius) of a single hexagon tile from its center to a corner.
   * @param {number} [headerHeight=0] The height of the header area above the map.
   */
  constructor(canvas, hexSize, headerHeight = 0) {
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
     * The height of the UI area at the top of the canvas.
     * @type {number}
     */
    this.headerHeight = headerHeight;

    /**
     * Padding around the map in pixels to prevent border clipping.
     * @type {number}
     * @private
     */
    this._padding = 1;
  }

  /**
   * Draws a single hexagonal tile on the canvas.
   * @param {HexTile} tile The HexTile object to draw.
   */
  drawHexTile(tile) {
    // Calculate the pixel center of the hex. This uses a "pointy-top" hexagon
    // orientation with an "odd-r" horizontal layout (odd rows are shifted).
    const cx = this.hexSize * Math.sqrt(3) * (tile.x + 0.5 * (tile.y & 1));
    const cy = this.hexSize * (3 / 2) * tile.y;

    const color = Renderer.biomeColors[tile.biomeType] || Renderer.biomeColors.default;

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
    this.ctx.strokeStyle = '#333'; // A dark border color
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // If the tile has content, draw it.
    if (tile.contentType === 'Residence') {
      this.ctx.fillStyle = '#8B4513'; // SaddleBrown for a residence
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.hexSize * 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
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
    const translateY = this.hexSize + this._padding + this.headerHeight;
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
      this.hexSize + this._padding + this.headerHeight
    );

    for (const row of map.grid) {
      for (const tile of row) {
        this.drawHexTile(tile);
      }
    }

    // Restore the context to its original state
    this.ctx.restore();
  }
}