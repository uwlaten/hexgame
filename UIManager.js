/**
 * @fileoverview Defines the UIManager class for managing HTML UI elements.
 */

import DrawingUtils from './DrawingUtils.js';
import Config from './Config.js';
import { BuildingLibrary, BuildingDefinitionMap } from './BuildingLibrary.js';
import { Building } from './Building.js';
import { Resource } from './Resource.js';
import { ResourceLibrary } from './ResourceLibrary.js';
import PlacementResolver from './PlacementResolver.js';
import { renderContext } from './main.js';
import { drawEndIndicator } from './ui/drawing.js';

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
    this.renderer = null;

    // Get references to the containers in the DOM.
    this.configPanelContainer = document.getElementById('config-panel');
    this.scoreContainer = document.getElementById('score-container');
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
    this.currentTileCanvas = null;
    this.currentTileCtx = null;
    this.nextTileCanvas = null;
    this.nextTileCtx = null;
    this.seedInput = null;
    this.randomSeedButton = null;
    this.totalTilesCountSpan = null;
    this.industryTilesCountSpan = null;
    this.residenceTilesCountSpan = null;
    this.roadTilesCountSpan = null;
    this.currentTileNameDiv = null;
    this.nextTileNameDiv = null;
  }

  /**
   * Creates the initial UI elements and sets up event listeners.
   */
  init() {
    this._createConfigSliders();
    this._createSeedInput();
    this._createNewGameButton();
    this._createScoreDisplay();
    this._createTooltipDisplay();

    // Get references to the tile preview canvases from the HTML
    this.currentTileCanvas = document.getElementById('current-tile-canvas');
    this.currentTileCtx = this.currentTileCanvas.getContext('2d');
    this.nextTileCanvas = document.getElementById('next-tile-canvas');
    this.nextTileCtx = this.nextTileCanvas.getContext('2d');

    // Get references to the tile counter spans
    this.totalTilesCountSpan = document.getElementById('total-tiles-count');
    this.industryTilesCountSpan = document.getElementById('industry-tiles-count');
    this.residenceTilesCountSpan = document.getElementById('residence-tiles-count');
    this.roadTilesCountSpan = document.getElementById('road-tiles-count');

    // Get references to the tile name divs
    this.currentTileNameDiv = document.getElementById('current-tile-name');
    this.nextTileNameDiv = document.getElementById('next-tile-name');

    // Subscribe to game events to keep the UI in sync.
    this.eventEmitter.on('SCORE_UPDATED', score => this.updateScore(score));
    this.eventEmitter.on('PLAYER_TILE_HAND_UPDATED', () => {
      this.updateTilePreviews();
      this.updateTileCounter();
    });
    this.eventEmitter.on('HEX_HOVERED', payload => {
      const { tile } = payload;
      let placementInfo = null;

      // Calculate placement info only if there's a tile, it's empty, and the player has a building.
      if (tile && !tile.contentType && this.player?.currentTileInHand && this.map) {
        const baseBuildingId = this.player.currentTileInHand;
        placementInfo = PlacementResolver.resolvePlacement(baseBuildingId, tile, this.map, this.player);
      }

      // Add placementInfo to the payload for the other functions to use.
      const newPayload = { ...payload, placementInfo };

      this.updateTooltip(newPayload);
      this.drawPlacementPreview(newPayload);
    });
  }

  /**
   * Provides the UIManager with references to the core game state objects.
   * @param {import('./Player.js').default} player The game's player instance.
   * @param {import('./Map.js').default} map The game's map instance.
   */
    setContext(player, map, renderer) {
    this.player = player;
    this.map = map;
    this.renderer = renderer;
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
   * Creates the seed input field and randomizer button.
   * @private
   */
  _createSeedInput() {
    const seedContainer = document.createElement('div');
    seedContainer.className = 'input-control';

    const seedLabel = document.createElement('label');
    seedLabel.htmlFor = 'seed-input';
    seedLabel.textContent = 'Seed:';

    // Create a wrapper to group the text input and button for flexbox layout.
    // This allows us to control their relative widths precisely.
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'seed-input-wrapper';

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    this.seedInput.id = 'seed-input';
    this.seedInput.placeholder = 'Leave blank for random';

    this.randomSeedButton = document.createElement('button');
    this.randomSeedButton.id = 'random-seed-button';
    this.randomSeedButton.textContent = 'Random';

    // Add event listener to the "Random" button to generate a new seed.
    this.randomSeedButton.addEventListener('click', () => {
      this.seedInput.value = Math.random().toString(36).substring(2, 15);
    });

    inputWrapper.append(this.seedInput, this.randomSeedButton);
    seedContainer.append(seedLabel, inputWrapper);
    this.configPanelContainer.appendChild(seedContainer);
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
    const seed = this.seedInput.value.trim() || null;

    return { waterLevel, temperature, mapSize, seed };
  }

  /**
   * Creates the score display element and appends it to its container.
   * @private
   */
  _createScoreDisplay() {
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.className = 'score-display';
    // Insert the score display before the tile counter display to ensure correct order.
    const tileCounter = document.getElementById('tile-counter-display');
    this.scoreContainer.insertBefore(this.scoreDisplay, tileCounter);
  }

  /**
   * Gets a reference to the tooltip container element from the DOM.
   * @private
   */
  _createTooltipDisplay() {
    this.tooltipContainer = document.getElementById('tooltip-container');
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
    * @param {{tile: import('./HexTile.js').default|null, event: MouseEvent|null, placementInfo: object|null}} payload The event payload.
   */
  updateTooltip(payload) {
     const { tile, event, placementInfo } = payload;

    if (tile && event) {
      // Construct the tooltip text, including the feature name if one exists.
      let tooltipText = `Coords: (${tile.x}, ${tile.y}) | Biome: ${tile.biome.name}`;
      if (tile.feature) {
        tooltipText += ` | Feature: ${tile.feature.name}`;
      }

      // Add information about the tile's content (building or resource).
      if (tile.contentType) {
        if (tile.contentType instanceof Building) {
          // For buildings, the 'type' property holds the name (e.g., 'Residence').
          tooltipText += ` | Building: ${tile.contentType.type}`;
        } else if (tile.contentType instanceof Resource) {
          // For resources, we need to look up the name in the ResourceLibrary
          // using the resource's 'type' property.
          const resourceDef = ResourceLibrary[tile.contentType.type.toUpperCase()];
          if (resourceDef) {
            tooltipText += ` | Resource: ${resourceDef.name}`;
            if (tile.contentType.isClaimed) {
              tooltipText += ' (Claimed)';
            }
          }
        } else {
          console.warn('Unknown content type in tooltip:', tile.contentType);
        }
      } else if (placementInfo) {
        // If the tile is empty and the player is holding a building, show placement preview.
        const result = placementInfo;

        if (result.isValid) {
          const buildingDef = BuildingDefinitionMap.get(result.resolvedBuildingId);
          const scoreText = result.score.total > 0 ? `+${result.score.total}` : result.score.total.toString();

          // Determine the building name to display. If a transformation has a `name`, use it; otherwise, use the base building name.
          let buildingName = buildingDef.name; // Default to base building name
          if (result.resolvedBuildingId !== this.player.currentTileInHand) {
            // Check if this transformation has a specific name (Residence transformations).
            const transformDef = BuildingDefinitionMap.get(result.resolvedBuildingId);
            if (transformDef?.name) {
              buildingName = transformDef.name; // Use transformation name if available
            }
          }

          // Style the display based on the score.
          let color = 'gray';  // Default for neutral scores
          if (result.score.total > 0) {
            color = 'green';  // Positive scores
          } else if (result.score.total < 0) {
            color = 'red';    // Negative scores
          }
          tooltipText += ` | Place: <span style="color:${color};">${buildingName} (${scoreText})</span>`;
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
    } else if (tile) {
      // Building placed: Update tooltip content but keep it visible at its last position.
      let tooltipText = `Coords: (${tile.x}, ${tile.y}) | Building: ${tile.contentType.type}`;  // Show building info after placement.
      this.tooltipContainer.innerHTML = tooltipText;
      this.tooltipContainer.style.display = 'block'; // Ensure it's still visible.
    }
    else {
        // If the tile AND event are null (mouse off canvas), hide the tooltip.
        // This condition isolates the 'mouse off' case.
        this.tooltipContainer.style.display = 'none';
    }
  }

  /**
   * Clears any temporary drawings from the overlay canvas.
   */
  clearPlacementPreview() {
    const { canvas, ctx } = renderContext.overlay;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Draws a preview of a potential building placement on the overlay canvas.
   * This includes score-based shading, resource claim outlines, and the building icon.
    * @param {{tile: import('./HexTile.js').default|null, placementInfo: object|null}} payload The event payload.
   */
  drawPlacementPreview(payload) {
    this.clearPlacementPreview();

    const { tile, placementInfo } = payload;
    // We only draw a preview if the placement is valid.
    if (!tile || !placementInfo || !placementInfo.isValid) {
      return;
    }

    // --- 1. Determine Shading Color ---
    let shadeColor = null;
    const score = placementInfo.score.total;

    const shading = Config.UIConfig.previewShading;
    if (score < 0) {
      shadeColor = shading.negative;
    } else if (score === 2) {
      shadeColor = shading.positive_ok;
    } else if (score > 2) {
      shadeColor = shading.positive_good;
    }

    // --- 2. Draw the Shading (if applicable) ---
    if (shadeColor) {
      const { ctx } = renderContext.overlay;
      const { x: offsetX, y: offsetY } = this.renderer.getTranslationOffset();
      const { x: tileX, y: tileY } = this.renderer.tileToPixel(tile);
      const hexSize = this.renderer.hexSize;

      ctx.fillStyle = shadeColor;
      DrawingUtils.drawHexPath(ctx, tileX + offsetX, tileY + offsetY, hexSize);
      ctx.fill();
    }

    // --- 3. Draw Building Icon ---
    // We draw the icon of the building that *would* be placed, including transformations.
    const buildingDef = BuildingDefinitionMap.get(placementInfo.resolvedBuildingId);
    if (buildingDef?.draw) {
      const { ctx } = renderContext.overlay;
      const { x: offsetX, y: offsetY } = this.renderer.getTranslationOffset();
      const { x: tileX, y: tileY } = this.renderer.tileToPixel(tile);
      const hexSize = this.renderer.hexSize;

      // DrawingUtils.drawDetails handles its own translation, so we pass the final screen coordinates.
      DrawingUtils.drawDetails(ctx, buildingDef, tileX + offsetX, tileY + offsetY, hexSize);
    }

    // --- 4. Draw Resource Claim Outline ---
    if (placementInfo.claimedResourceTile) {
      const { ctx } = renderContext.overlay;
      const { x: offsetX, y: offsetY } = this.renderer.getTranslationOffset();

      ctx.save();
      ctx.translate(offsetX, offsetY); // Apply the same offset as the main renderer.

      const tilesToOutline = [tile, placementInfo.claimedResourceTile];
      // Call the refactored method, passing the overlay context.
      this.renderer.tileOutline(tilesToOutline, Config.tileOutlineStyle, ctx);

      ctx.restore(); // Remove the translation.
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

  /**
   * Draws a preview of a single tile onto a given canvas.
   * @param {CanvasRenderingContext2D} ctx The rendering context.
   * @param {HTMLCanvasElement} canvas The canvas to draw on.
   * @param {string} tileId The ID of the building to draw.
   * @private
   */
  _drawTilePreview(ctx, canvas, tileId) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hexSize = Math.min(canvas.width, canvas.height) / 2 * 0.85;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Draw a generic background tile for the icon.
    this._drawHexagon(ctx, cx, cy, hexSize, '#f0e68c'); // Steppe color as a neutral background.

    // Find the building's definition in the library and use the new utility to draw it.
    const buildingDefinition = BuildingDefinitionMap.get(tileId);
    if (buildingDefinition?.draw) {
      DrawingUtils.drawDetails(ctx, buildingDefinition, cx, cy, hexSize);
    }
  }

  /**
   * Updates both the "Current Tile" and "Next Tile" previews.
   * This function reads directly from the player's state.
   */
  updateTilePreviews() {
    if (!this.player) return;

    const currentTileId = this.player.currentTileInHand;
    // The "next" tile is the one at the top of the deck (which is the end of the array because of pop())
    const nextTileId = this.player.deck.length > 0 ? this.player.deck[this.player.deck.length - 1] : null;

    // Draw the current tile being placed
    if (currentTileId) {
      this._drawTilePreview(this.currentTileCtx, this.currentTileCanvas, currentTileId);
      const buildingDef = BuildingDefinitionMap.get(currentTileId);
      this.currentTileNameDiv.textContent = buildingDef?.name || '';
    } else {
      // If there's no current tile, the game is likely over.
      drawEndIndicator(this.currentTileCanvas);
      this.currentTileNameDiv.textContent = '';
    }

    // Draw the upcoming tile
    if (nextTileId) {
      this._drawTilePreview(this.nextTileCtx, this.nextTileCanvas, nextTileId);
      const buildingDef = BuildingDefinitionMap.get(nextTileId);
      this.nextTileNameDiv.textContent = buildingDef?.name || '';
    } else {
      // If there's no next tile, the deck is empty.
      drawEndIndicator(this.nextTileCanvas);
      this.nextTileNameDiv.textContent = '';
    }
  }

  /**
   * Updates the tile counter display with the total and breakdown of tiles remaining in the deck.
   */
  updateTileCounter() {
    if (!this.player) return;

    const deck = this.player.deck;
    const totalCount = deck.length;

    // Use reduce to get the breakdown in a single pass, initializing with the keys we care about.
    const breakdown = deck.reduce((acc, tileId) => {
      if (acc.hasOwnProperty(tileId)) {
        acc[tileId]++;
      }
      return acc;
    }, { 'Industry': 0, 'Residence': 0, 'Road': 0 });

    // Update the DOM elements
    this.totalTilesCountSpan.textContent = totalCount;
    this.industryTilesCountSpan.textContent = breakdown['Industry'];
    this.residenceTilesCountSpan.textContent = breakdown['Residence'];
    this.roadTilesCountSpan.textContent = breakdown['Road'];
  }
}