/**
 * @fileoverview Defines the UIManager class for managing HTML UI elements.
 */

import { BuildingLibrary } from './BuildingLibrary.js';

/**
 * Manages all HTML-based UI components. It creates the elements,
 * updates their content, and will handle user interactions with them.
 */
export default class UIManager {
  /**
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;

    // Get references to the containers in the DOM.
    this.configPanelContainer = document.getElementById('config-panel');
    this.scoreContainer = document.getElementById('score-container');
    this.nextTileContainer = document.getElementById('next-tile-container');
    this.tooltipContainer = null;

    // Create the elements that will be managed by this class.
    this.scoreDisplay = null;
    this.newGameButton = null;
    this.temperatureSlider = null;
    this.temperatureOutput = null;
    this.waterSlider = null;
    this.waterOutput = null;
    this.nextTileLabel = null;
    this.nextTileCanvas = null;
    this.nextTileCtx = null;
  }

  /**
   * Creates the initial UI elements and sets up event listeners.
   */
  init() {
    this._createConfigSliders();
    this._createNewGameButton();
    this._createScoreDisplay();
    this._createNextTileDisplay();
    this._createTooltipDisplay();

    // Subscribe to game events to keep the UI in sync.
    this.eventEmitter.on('SCORE_UPDATED', score => this.updateScore(score));
    this.eventEmitter.on('PLAYER_TILE_HAND_UPDATED', tileId => this.updateNextTile(tileId));
    this.eventEmitter.on('HEX_HOVERED', payload => this.updateTooltip(payload));
  }

  /**
   * Creates the configuration sliders for map generation.
   * @private
   */
  _createConfigSliders() {
    // --- Temperature Slider ---
    const tempContainer = document.createElement('div');
    tempContainer.className = 'slider-control';

    const tempLabel = document.createElement('label');
    tempLabel.htmlFor = 'temperature-slider';
    tempLabel.textContent = 'Temp:';

    this.temperatureSlider = document.createElement('input');
    this.temperatureSlider.type = 'range';
    this.temperatureSlider.id = 'temperature-slider';
    this.temperatureSlider.min = 0;
    this.temperatureSlider.max = 2;
    this.temperatureSlider.step = 1;
    this.temperatureSlider.value = 1; // Default to Temperate

    this.temperatureOutput = document.createElement('output');
    this.temperatureOutput.htmlFor = 'temperature-slider';
    const tempValues = ['Cold', 'Temperate', 'Hot'];
    this.temperatureOutput.textContent = tempValues[this.temperatureSlider.value];

    this.temperatureSlider.addEventListener('input', () => {
      this.temperatureOutput.textContent = tempValues[this.temperatureSlider.value];
    });

    tempContainer.append(tempLabel, this.temperatureSlider, this.temperatureOutput);

    // --- Water Slider ---
    const waterContainer = document.createElement('div');
    waterContainer.className = 'slider-control';

    const waterLabel = document.createElement('label');
    waterLabel.htmlFor = 'water-slider';
    waterLabel.textContent = 'Water:';

    this.waterSlider = document.createElement('input');
    this.waterSlider.type = 'range';
    this.waterSlider.id = 'water-slider';
    this.waterSlider.min = 20;
    this.waterSlider.max = 70;
    this.waterSlider.value = 40; // Default to 40%

    this.waterOutput = document.createElement('output');
    this.waterOutput.htmlFor = 'water-slider';
    this.waterOutput.textContent = `${this.waterSlider.value}%`;

    this.waterSlider.addEventListener('input', () => {
      this.waterOutput.textContent = `${this.waterSlider.value}%`;
    });

    waterContainer.append(waterLabel, this.waterSlider, this.waterOutput);

    this.configPanelContainer.append(tempContainer, waterContainer);
  }

  /**
   * Creates the "New Game" button and attaches its event listener.
   * @private
   */
  _createNewGameButton() {
    this.newGameButton = document.createElement('button');
    this.newGameButton.textContent = 'New Game';
    this.newGameButton.addEventListener('click', () => {
      // Announce that the user wants a new game. The Game class will handle the logic.
      this.eventEmitter.emit('NEW_GAME_REQUESTED');
    });
    this.configPanelContainer.appendChild(this.newGameButton);
  }

  /**
   * Retrieves the current map generation settings from the UI controls.
   * @returns {{waterLevel: number, temperature: string}}
   */
  getGenerationOptions() {
    const tempValues = ['cold', 'temperate', 'hot'];
    const temperature = tempValues[this.temperatureSlider.value];
    const waterLevel = parseInt(this.waterSlider.value, 10);

    return { waterLevel, temperature };
  }

  /**
   * Creates the score display element and appends it to its container.
   * @private
   */
  _createScoreDisplay() {
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.className = 'score-display';
    this.scoreContainer.appendChild(this.scoreDisplay);
  }

  /**
   * Gets a reference to the tooltip container element from the DOM.
   * @private
   */
  _createTooltipDisplay() {
    this.tooltipContainer = document.getElementById('tooltip-container');
  }

  /**
   * Creates the "Next Tile" display, which includes a text label and a canvas for the icon.
   * @private
   */
  _createNextTileDisplay() {
    const container = document.createElement('div');
    container.className = 'next-tile-display';

    this.nextTileLabel = document.createElement('span');
    this.nextTileLabel.textContent = 'Next Tile:';

    this.nextTileCanvas = document.createElement('canvas');
    this.nextTileCanvas.width = 60;
    this.nextTileCanvas.height = 60;
    this.nextTileCtx = this.nextTileCanvas.getContext('2d');

    container.appendChild(this.nextTileLabel);
    container.appendChild(this.nextTileCanvas);
    this.nextTileContainer.appendChild(container);
  }

  /**
   * Updates the score text content.
   * @param {number} score The new score.
   */
  updateScore(score) {
    this.scoreDisplay.textContent = `Score: ${score}`;
  }

  /**
   * Updates the tooltip's content and position based on the hovered tile.
   * @param {{tile: import('./HexTile.js').default|null, event: MouseEvent|null}} payload The event payload from the InputHandler.
   */
  updateTooltip(payload) {
    const { tile, event } = payload;

    if (tile && event) {
      // Construct the tooltip text, including the feature name if one exists.
      let tooltipText = `Coords: (${tile.x}, ${tile.y}) | Biome: ${tile.biome.name}`;
      if (tile.feature) {
        tooltipText += ` | Feature: ${tile.feature.name}`;
      }

      this.tooltipContainer.textContent = tooltipText;
      this.tooltipContainer.style.display = 'block';

      // Position the tooltip near the cursor. The offset (e.g., +15px) prevents the
      // tooltip from flickering by being directly under the cursor, which would
      // trigger a 'mouseleave' event on the canvas.
      this.tooltipContainer.style.left = `${event.clientX + 15}px`;
      this.tooltipContainer.style.top = `${event.clientY + 15}px`;
    } else {
      // If the tile or event is null, hide the tooltip.
      this.tooltipContainer.style.display = 'none';
    }
  }

  /**
   * Updates the "Next Tile" icon by redrawing it.
   * @param {string|null} tileId The ID of the tile in the player's hand.
   */
  updateNextTile(tileId) {
    const ctx = this.nextTileCtx;
    const canvas = this.nextTileCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!tileId) return;

    const hexSize = 20;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    this._drawHexagon(ctx, cx, cy, hexSize, '#f0e68c'); // Savannah color

    if (tileId === BuildingLibrary.RESIDENCE.id) {
      ctx.fillStyle = '#8B4513'; // SaddleBrown
      ctx.beginPath();
      ctx.arc(cx, cy, hexSize * 0.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  /**
   * Draws a single hexagon at a given center point.
   * @param {CanvasRenderingContext2D} ctx The rendering context.
   * @param {number} cx The center x-coordinate.
   * @param {number} cy The center y-coordinate.
   * @param {number} size The radius of the hexagon.
   * @param {string} color The fill color of the hexagon.
   * @private
   */
  _drawHexagon(ctx, cx, cy, size, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // Angle for pointy-top hex. -90 degrees or -PI/2 radians to start at the top.
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(vx, vy);
      } else {
        ctx.lineTo(vx, vy);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}