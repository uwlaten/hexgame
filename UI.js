/**
 * @fileoverview Defines the UI class for drawing interface elements.
 */

/**
 * Handles the rendering of all User Interface elements, such as text,
 * score displays, and menus, onto the canvas.
 */
export default class UI {
  /**
   * Creates an instance of the UI renderer.
   * @param {CanvasRenderingContext2D} ctx The 2D rendering context.
   * @param {import('./Player.js').default} player The player object to get data from.
   * @param {number} hexSize The base size of the hexes, for drawing the preview tile.
   * @param {number} [headerHeight=0] The height of the header area.
   */
  constructor(ctx, player, hexSize, headerHeight = 0) {
    this.ctx = ctx;
    this.player = player;
    this.hexSize = hexSize;
    this.headerHeight = headerHeight;
  }

  /**
   * Draws all UI elements onto the canvas. This is the main entry point for UI rendering.
   */
  draw() {
    this._drawNextTileDisplay();
  }

  /**
   * Draws the "Next Tile" display in the top-right corner of the canvas.
   * @private
   */
  _drawNextTileDisplay() {
    const displayHexSize = this.hexSize * 1.5;
    // Position the hex icon near the right edge to make room for the text.
    const hexX = this.ctx.canvas.width - displayHexSize * 1.5;
    const hexY = this.headerHeight / 2;

    // Draw the text label to the left of the icon.
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Next Tile:', hexX - displayHexSize - 10, hexY);

    // Draw the hexagon background and content icon.
    this._drawHexagon(hexX, hexY, displayHexSize, '#f0e6c'); // Plains color

    // Draw the icon for the tile in hand
    if (this.player.currentTileInHand === 'Residence') {
      this.ctx.fillStyle = '#8B4513'; // SaddleBrown
      this.ctx.beginPath();
      this.ctx.arc(hexX, hexY, displayHexSize * 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  /**
   * Draws a single hexagon at a given center point.
   * @param {number} cx The center x-coordinate.
   * @param {number} cy The center y-coordinate.
   * @param {number} size The radius of the hexagon.
   * @param {string} color The fill color of the hexagon.
   * @private
   */
  _drawHexagon(cx, cy, size, color) {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2; // Pointy-top
      this.ctx.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }
}