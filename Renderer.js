/**
 * @fileoverview Defines the Renderer class for drawing the game state onto a canvas.
 */

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
    this.ctx.strokeStyle = '#333'; // A dark border color
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // If the biome itself has special drawing instructions (like waves on water), draw them.
    if (tile.biome.draw) {
      this._drawDetails(tile.biome, cx, cy);
    }

    // If the tile has a feature (like hills), draw it on top of the biome.
    if (tile.feature) {
      this._drawDetails(tile.feature, cx, cy);
    }

    // If the tile has content, draw it.
    if (tile.contentType instanceof Building && tile.contentType.type === BuildingLibrary.RESIDENCE.id) {
      this.ctx.fillStyle = '#8B4513'; // SaddleBrown for a residence
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.hexSize * 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  /**
   * Draws detailed graphics for a biome or feature on a tile.
   * This method interprets the 'draw' property of a biome or feature object.
   * @param {object} drawable The biome or feature object containing drawing instructions.
   * @param {number} cx The center x-coordinate of the hex.
   * @param {number} cy The center y-coordinate of the hex.
   * @private
   */
  _drawDetails(drawable, cx, cy) {
    if (!drawable.draw) return; // Nothing to draw.

    this.ctx.save();
    // Translate the canvas origin to the center of the hex for relative drawing.
    this.ctx.translate(cx, cy);

    if (drawable.draw.type === 'shapes') {
      for (const shape of drawable.draw.shapes) {
        this.ctx.beginPath();

        // Set styles for this specific shape, with fallbacks to the feature-level style.
        this.ctx.fillStyle = shape.fillStyle || 'transparent';
        this.ctx.strokeStyle = shape.strokeStyle || drawable.draw.strokeStyle || 'transparent';
        this.ctx.lineWidth = shape.lineWidth || drawable.draw.lineWidth || 1;

        if (shape.type === 'arc') {
          const [arcX, arcY, radius, startAngle, endAngle] = shape.params;
          this.ctx.arc(arcX, arcY, radius, startAngle, endAngle);
        } else if (shape.type === 'rect') {
          const [rectX, rectY, width, height] = shape.params;
          this.ctx.rect(rectX, rectY, width, height);
        } else if (shape.type === 'circle') {
          const [circX, circY, radius] = shape.params;
          this.ctx.arc(circX, circY, radius, 0, 2 * Math.PI);
        } else if (shape.type === 'polygon') {
          const points = shape.params;
          if (points && points.length > 1) {
            this.ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
              this.ctx.lineTo(points[i][0], points[i][1]);
            }
            this.ctx.closePath();
          }
        }

        // Draw the shape based on the styles provided.
        if (this.ctx.fillStyle !== 'transparent') {
          this.ctx.fill();
        }
        if (this.ctx.strokeStyle !== 'transparent') {
          this.ctx.stroke();
        }
      }
    }

    this.ctx.restore(); // Restore the canvas origin.
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

    // Restore the context to its original state
    this.ctx.restore();
  }
}