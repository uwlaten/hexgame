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

    // Bind the context of 'this' for the event handler method to ensure
    // 'this' inside _handleClick refers to the InputHandler instance.
    this._handleClick = this._handleClick.bind(this);
  }

  /**
   * Initializes the input handler by attaching event listeners.
   */
  init() {
    this.canvas.addEventListener('click', this._handleClick);
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
}