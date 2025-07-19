/**
 * @fileoverview Defines the InputHandler class for processing user input.
 * It captures raw browser events and translates them into meaningful game events.
 */

/**
 * Listens for input on the canvas, converts it to game-specific
 * coordinates and actions, and emits events via the EventEmitter.
 */
export default class InputHandler {
  /**
   * Creates an instance of InputHandler.
   * @param {HTMLCanvasElement} canvas The canvas element to listen for events on.
   * @param {import('./EventEmitter.js').default} eventEmitter The event emitter to fire events on.
   * @param {import('./Renderer.js').default} renderer The renderer, used for coordinate conversion.
   * @param {import('./Map.js').default} map The game map, to find tiles at coordinates.
   */
  constructor(canvas, eventEmitter, renderer, map) {
    this.canvas = canvas;
    this.eventEmitter = eventEmitter;
    this.renderer = renderer;
    this.map = map;

    this.lastHoveredTile = null;

    // Bind the context of 'this' for the event handler method to ensure
    // 'this' inside _handleClick refers to the InputHandler instance.
    this._handleClick = this._handleClick.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Initializes the input handler by attaching event listeners.
   */
  init() {
    this.canvas.addEventListener('click', this._handleClick);
    this.canvas.addEventListener('mousemove', this._handleMouseMove);
    // Handle the case where the mouse leaves the canvas area entirely.
    this.canvas.addEventListener('mouseleave', () => this._handleMouseMove(null));
    // Add a global keydown listener to handle tile swapping.
    document.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Handles keydown events for global actions like swapping tiles.
   * @param {KeyboardEvent} event The keyboard event.
   * @private
   */
  _handleKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault(); // Prevent the browser's default tabbing behavior.
      this.eventEmitter.emit('SWAP_TILE_REQUESTED');
      if (this.lastHoveredTile != null) {
        this.eventEmitter.emit('HEX_HOVERED', {tile: this.lastHoveredTile, event: null});
      }
    }
  }

  /**
   * Handles the click event on the canvas.
   * @param {MouseEvent} event The mouse click event.
   * @private
   */
  _handleClick(event) {
    // Get click coordinates relative to the canvas element.
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Use the renderer to convert pixel coordinates to hex grid coordinates.
    const hexCoords = this.renderer.pixelToHex(x, y);

    // Get the tile at the calculated coordinates from the map.
    const tile = this.map.getTileAt(hexCoords.x, hexCoords.y);

    if (tile) {
      // If a valid tile was clicked, emit a 'HEX_CLICKED' event with the tile data.
      this.eventEmitter.emit('HEX_CLICKED', tile);
    }
  }

  /**
   * Handles the mouse move event on the canvas to detect hovering.
   * @param {MouseEvent|null} event The mouse move event, or null if the mouse leaves the canvas.
   * @private
   */
  _handleMouseMove(event) {
    let tile = null;

    if (event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hexCoords = this.renderer.pixelToHex(x, y);
      tile = this.map.getTileAt(hexCoords.x, hexCoords.y);
    }

    // Only emit an event if the hovered tile has changed.
    // This prevents firing hundreds of events when the mouse moves within the same hex.
    if (tile !== this.lastHoveredTile) {
      // The payload includes the tile and the original event, which the UIManager
      // will use to correctly position the tooltip near the cursor.
      this.eventEmitter.emit('HEX_HOVERED', { tile, event });
      this.lastHoveredTile = tile;
    }
  }
}