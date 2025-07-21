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
import HexGridUtils from './HexGridUtils.js';
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

    /**
     * An array to keep track of active toast notifications.
     * @type {HTMLElement[]}
     */
    this.activeNotifications = [];

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
    this.gameOverPopup = null;
    this.choice1Container = null;
    this.choice2Container = null;
  }

  /**
   * Creates the initial UI elements and sets up event listeners.
   */
  init() {
    this._createConfigSliders();
    this._createSeedInput();
    this._createNewGameButton();
    this._createScoreDisplay();
    this._createGameOverPopup();
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

    // Get references to the tile preview containers for highlighting
    this.choice1Container = document.getElementById('current-tile-display');
    this.choice2Container = document.getElementById('next-tile-display');

    // Subscribe to game events to keep the UI in sync.
    this.eventEmitter.on('SCORE_UPDATED', score => this.updateScore(score));
    this.eventEmitter.on('PLAYER_TILE_HAND_UPDATED', () => {
      this.updateTilePreviews();
      this.updateTileCounter();
    });
    this.eventEmitter.on('GAME_OVER', (reason = 'The deck is empty!') => {
      setTimeout(() => this.showGameOverPopup(reason), 100);
    });    
    this.eventEmitter.on('TILES_AWARDED', message => this._showNotification(message));
    // Also listen for a new game request to hide the popup if it's open.
    this.eventEmitter.on('NEW_GAME_REQUESTED', () => {
      this.hideGameOverPopup();
      this._clearAllNotifications();
    });

    this.eventEmitter.on('HEX_HOVERED', payload => {
      const { tile } = payload;
      let placementInfo = null;

      // Calculate placement info only if there's a tile, it's empty, and the player has a building.
      if (tile && !tile.contentType && this.player?.getActiveTile() && this.map) {
        const baseBuildingId = this.player.getActiveTile();
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
   * Creates the "Game Over" modal popup and appends it to the body.
   * It is initially hidden.
   * @private
   */
  _createGameOverPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none'; // Initially hidden

    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h2');
    title.textContent = 'Game Over';

    const scoreText = document.createElement('p');
    scoreText.id = 'final-score-text'; // To easily update it

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'Play Again';
    newGameBtn.addEventListener('click', () => {
      this.hideGameOverPopup();
      this.eventEmitter.emit('NEW_GAME_REQUESTED');
    });

    content.append(title, scoreText, newGameBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    this.gameOverPopup = overlay;
  }

  /**
   * Hides the game over popup.
   */
  hideGameOverPopup() {
    if (this.gameOverPopup) {
      this.gameOverPopup.style.display = 'none';
    }
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

    if (!tile) {
      // If there's no tile (e.g., mouse left canvas), hide the tooltip.
      this.tooltipContainer.style.display = 'none';
      return;
    }

    // --- Part 1: Construct the tooltip text ---
    let tooltipText = `Coords: (${tile.x}, ${tile.y}) | Biome: ${tile.biome.name}`;
    if (tile.feature) {
      tooltipText += ` | Feature: ${tile.feature.name}`;
    }

    // Add information about the tile's content (building or resource).
    if (tile.contentType) {
      if (tile.contentType instanceof Building) {
        tooltipText += ` | Building: ${tile.contentType.type}`;
      } else if (tile.contentType instanceof Resource) {
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
        
        let buildingName = buildingDef.name; // Default to base building name
        if (result.resolvedBuildingId !== this.player.getActiveTile()) {
          const transformDef = BuildingDefinitionMap.get(result.resolvedBuildingId);
          if (transformDef?.name) {
            buildingName = transformDef.name;
          }
        }

        let color = 'gray';
        if (result.score.total > 0) color = 'green';
        else if (result.score.total < 0) color = 'red';
        tooltipText += ` | Place: <span style="color:${color};">${buildingName} (${scoreText})</span>`;
      } else {
        tooltipText += ` | <span style="color:red;">Cannot build here</span>`;
      }
    }

    // --- Part 2: Update the DOM ---
    this.tooltipContainer.innerHTML = tooltipText;
    this.tooltipContainer.style.display = 'block';

    // --- Part 3: Position the tooltip ONLY if there's a mouse event ---
    if (event) {
      this.tooltipContainer.style.left = `${event.clientX + 15}px`;
      this.tooltipContainer.style.top = `${event.clientY + 15}px`;
    }
  }

  /**
   * Displays the game over popup with the final score.
   * @param {string} [reason=''] The reason the game ended.
   */
  showGameOverPopup(reason = '') {
    if (!this.gameOverPopup || !this.player) return;

    const scoreText = this.gameOverPopup.querySelector('#final-score-text');
    scoreText.innerHTML = `Your final score is: ${this.player.score}<br><small>${reason}</small>`;

    this.gameOverPopup.style.display = 'flex';
  }

  /**
   * Removes all active toast notifications from the screen.
   * This is called when a new game starts to prevent old notifications from persisting.
   * @private
   */
  _clearAllNotifications() {
    for (const notification of this.activeNotifications) {
      notification.remove();
    }
    this.activeNotifications = [];
  }

  /**
   * Displays a temporary "toast" notification on the screen.
   * The notification will require CSS for styling and animation.
   * @param {string} message The message to display.
   * @private
   */
  _showNotification(message) {
    // Ensure the notification is appended relative to the game area, not the whole page.
    const container = this.renderer?.canvas.parentElement;
    if (!container) {
      console.error("Cannot show notification: Game container not found.");
      return;
    }

    const notification = document.createElement('div');
    notification.className = 'toast-notification';
    notification.textContent = message;

    container.appendChild(notification);
    this.activeNotifications.push(notification);

    // A small delay ensures the element is in the DOM before the 'show' class is added,
    // allowing the CSS transition to trigger correctly.
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Set a timer to start the fade-out process.
    setTimeout(() => {
      notification.classList.remove('show');

      // Set a second, reliable timer to remove the element from the DOM after
      // the CSS fade-out transition has completed. This avoids relying on the
      // sometimes-unreliable 'transitionend' event.
      setTimeout(() => {
        notification.remove();
        const index = this.activeNotifications.indexOf(notification);
        if (index > -1) this.activeNotifications.splice(index, 1);
      }, Config.UIConfig.notificationTransitionDuration);
    }, Config.UIConfig.notificationDuration);
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

    // --- 4. Draw Placement Outline (based on config) ---
    let shouldDrawOutline = false;
    // The config is now an array of conditions. Draw if any are met.
    for (const condition of Config.UIConfig.previewOutlineMode) {
      switch (condition) {
        case 'anyValidPlacement':
          shouldDrawOutline = true;
          break;
        case 'resourceClaimsOnly':
          if (placementInfo.claimedResourceTile) {
            shouldDrawOutline = true;
          }
          break;
        case 'onNegativeScore':
          if (placementInfo.score.total < 0) {
            shouldDrawOutline = true;
          }
          break;
        case 'onPositiveScore':
          if (placementInfo.score.total > 0) {
            shouldDrawOutline = true;
          }
          break;
      }
      if (shouldDrawOutline) break; // If one condition is met, no need to check others.
    }

    if (shouldDrawOutline) {
      const tilesToOutline = [tile];
      if (placementInfo.claimedResourceTile) {
        tilesToOutline.push(placementInfo.claimedResourceTile);
      }

      const { ctx } = renderContext.overlay;
      const { x: offsetX, y: offsetY } = this.renderer.getTranslationOffset();

      ctx.save();
      ctx.translate(offsetX, offsetY); // Apply the same offset as the main renderer.

      const perimeterVertexIds = HexGridUtils.getOuterPerimeter(tilesToOutline, this.map);
      const perimeterPixels = perimeterVertexIds.map(vId => this.renderer._getVertexPixelCoords(vId, this.map)).filter(Boolean);

      if (perimeterPixels.length > 1) {
        const style = Config.tileOutlineStyle;
        ctx.strokeStyle = style.strokeStyle;
        ctx.lineWidth = style.lineWidth;
        ctx.setLineDash(Config.tileOutlineDash);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(perimeterPixels[0].x, perimeterPixels[0].y);
        for (let i = 1; i < perimeterPixels.length; i++) {
          ctx.lineTo(perimeterPixels[i].x, perimeterPixels[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
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

    // Use the centralized utility to create the path, then apply local styles.
    DrawingUtils.drawHexPath(ctx, cx, cy, size);
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
   * Updates the tile choice previews based on the player's hand.
   */
  updateTilePreviews() {
    if (!this.player) return;

    // Use the stored references from the init() method.
    const { choice1Container, choice2Container } = this;

    // Clear existing highlights
    if (choice1Container) choice1Container.classList.remove('active-choice');
    if (choice2Container) choice2Container.classList.remove('active-choice');

    const hand = this.player.hand;
    const activeIndex = this.player.activeTileIndex;

    // Handle Choice 1 (always exists if hand has items)
    if (hand.length > 0) {
      const tileId1 = hand[0];
      this._drawTilePreview(this.currentTileCtx, this.currentTileCanvas, tileId1);
      const buildingDef1 = BuildingDefinitionMap.get(tileId1);
      if (this.currentTileNameDiv) this.currentTileNameDiv.textContent = buildingDef1?.name || 'Place to Start';
      if (activeIndex === 0 && choice1Container) {
        choice1Container.classList.add('active-choice');
      }
    } else {
      // Hand is empty, game over.
      drawEndIndicator(this.currentTileCanvas);
      if (this.currentTileNameDiv) this.currentTileNameDiv.textContent = '';
    }

    // Handle Choice 2 (only exists after City Centre is placed)
    if (hand.length > 1) {
      const tileId2 = hand[1];
      this._drawTilePreview(this.nextTileCtx, this.nextTileCanvas, tileId2);
      const buildingDef2 = BuildingDefinitionMap.get(tileId2);
      if (this.nextTileNameDiv) this.nextTileNameDiv.textContent = buildingDef2?.name || '';
      if (activeIndex === 1 && choice2Container) {
        choice2Container.classList.add('active-choice');
      }
    } else {
      // Only one tile in hand (City Centre phase) or hand is empty.
      drawEndIndicator(this.nextTileCanvas);
      if (this.nextTileNameDiv) this.nextTileNameDiv.textContent = '';
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