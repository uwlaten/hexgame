/**
 * @fileoverview Defines the UIManager class for managing HTML UI elements.
 */

import DrawingUtils from './DrawingUtils.js';
import Config from './Config.js';
import { BuildingLibrary, BuildingDefinitionMap } from './BuildingLibrary.js';
import { Building } from './Building.js';
import PlacementResolver from './PlacementResolver.js';

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

    // These will be populated by the Game class after initialization.
    this.player = null;
    this.map = null;

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
    this.mapSizeSlider = null;
    this.mapSizeOutput = null;
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
   * Provides the UIManager with references to the core game state objects.
   * @param {import('./Player.js').default} player The game's player instance.
   * @param {import('./Map.js').default} map The game's map instance.
   */
  setContext(player, map) {
    this.player = player;
    this.map = map;
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

    const tempConfig = Config.UIConfig.generationSliderRanges.temperature;
    this.temperatureSlider = document.createElement('input');
    this.temperatureSlider.type = 'range';
    this.temperatureSlider.id = 'temperature-slider';
    this.temperatureSlider.min = tempConfig.min;
    this.temperatureSlider.max = tempConfig.max;
    this.temperatureSlider.step = tempConfig.step;
    this.temperatureSlider.value = tempConfig.value;

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

    const waterConfig = Config.UIConfig.generationSliderRanges.waterLevel;
    this.waterSlider = document.createElement('input');
    this.waterSlider.type = 'range';
    this.waterSlider.id = 'water-slider';
    this.waterSlider.min = waterConfig.min;
    this.waterSlider.max = waterConfig.max;
    this.waterSlider.value = waterConfig.value;

    this.waterOutput = document.createElement('output');
    this.waterOutput.htmlFor = 'water-slider';
    this.waterOutput.textContent = `${this.waterSlider.value}%`;

    this.waterSlider.addEventListener('input', () => {
      this.waterOutput.textContent = `${this.waterSlider.value}%`;
    });

    waterContainer.append(waterLabel, this.waterSlider, this.waterOutput);

    // --- Map Size Slider ---
    const mapSizeContainer = document.createElement('div');
    mapSizeContainer.className = 'slider-control';

    const mapSizeLabel = document.createElement('label');
    mapSizeLabel.htmlFor = 'map-size-slider';
    mapSizeLabel.textContent = 'Size:';

    const mapSizeConfig = Config.UIConfig.generationSliderRanges.mapSize;
    this.mapSizeSlider = document.createElement('input');
    this.mapSizeSlider.type = 'range';
    this.mapSizeSlider.id = 'map-size-slider';
    this.mapSizeSlider.min = mapSizeConfig.min;
    this.mapSizeSlider.max = mapSizeConfig.max;
    this.mapSizeSlider.step = mapSizeConfig.step;
    this.mapSizeSlider.value = mapSizeConfig.value;

    this.mapSizeOutput = document.createElement('output');
    this.mapSizeOutput.htmlFor = 'map-size-slider';
    this.mapSizeOutput.textContent = `${this.mapSizeSlider.value}x${this.mapSizeSlider.value}`;

    this.mapSizeSlider.addEventListener('input', () => {
      this.mapSizeOutput.textContent = `${this.mapSizeSlider.value}x${this.mapSizeSlider.value}`;
    });

    mapSizeContainer.append(mapSizeLabel, this.mapSizeSlider, this.mapSizeOutput);

    this.configPanelContainer.append(tempContainer, waterContainer, mapSizeContainer);
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
    const mapSize = parseInt(this.mapSizeSlider.value, 10);

    return { waterLevel, temperature, mapSize };
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

    const displayConfig = Config.UIConfig.nextTileDisplay;
    this.nextTileCanvas = document.createElement('canvas');
    this.nextTileCanvas.width = displayConfig.width;
    this.nextTileCanvas.height = displayConfig.height;
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

      // Add information about the tile's content (building or resource).
      if (tile.contentType) {
        // The contentType can be an instance of Building or a plain object from the ResourceLibrary.
        if (tile.contentType instanceof Building) {
          // For buildings, the 'type' property holds the name (e.g., 'Residence').
          tooltipText += ` | Building: ${tile.contentType.type}`;
        } else {
          // For resources, the 'name' property holds the name (e.g., 'Iron').
          tooltipText += ` | Resource: ${tile.contentType.name}`;
        }
      } else if (this.player?.currentTileInHand && this.map) {
        // If the tile is empty and the player is holding a building, show placement preview.
        const baseBuildingId = this.player.currentTileInHand;
        const result = PlacementResolver.resolvePlacement(baseBuildingId, tile, this.map, this.player);

        if (result.isValid) {
          const buildingDef = BuildingDefinitionMap.get(result.resolvedBuildingId);
          const scoreText = result.score > 0 ? `+${result.score}` : result.score.toString();
          const color = result.score > 0 ? 'green' : (result.score < 0 ? 'red' : 'gray');
          tooltipText += ` | Place: <span style="color:${color};">${buildingDef.name} (${scoreText})</span>`;
        } else {
          tooltipText += ` | <span style="color:red;">Cannot build here</span>`;
        }
      }

      this.tooltipContainer.innerHTML = tooltipText; // Use innerHTML to render the span colors
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

    const hexSize = Config.UIConfig.nextTileDisplay.hexSize;
    const cx = canvas.width / 2;  
    const cy = canvas.height / 2;

    // Draw a generic background tile for the icon.
    this._drawHexagon(ctx, cx, cy, hexSize, '#f0e68c'); // Savannah color as a neutral background.

    // Find the building's definition in the library and use the new utility to draw it.
    const buildingDefinition = BuildingDefinitionMap.get(tileId);
    if (buildingDefinition?.draw) {
      DrawingUtils.drawDetails(ctx, buildingDefinition, cx, cy, hexSize);
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