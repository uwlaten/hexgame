/**
 * @fileoverview Defines the GameLoop class for running the main game cycle.
 */

/**
 * Manages the continuous update and render cycle of the game.
 * It uses requestAnimationFrame to be efficient and browser-friendly.
 */
export default class GameLoop {
  /**
   * Creates an instance of the GameLoop.
   * @param {import('./Renderer.js').default} renderer The renderer instance to use for drawing.
   * @param {import('./Map.js').default} map The map instance to be rendered.
   */
  constructor(renderer, map) {
    this.renderer = renderer;
    this.map = map;
    this.animationFrameId = null;
    this.isRunning = false;
  }

  /**
   * The core loop function that gets called each frame.
   * It's a private method, indicated by the underscore.
   */
  _loop() {
    // In the future, input processing and game state updates will go here.

    // Render the current state of the map.
    this.renderer.drawMap(this.map);

    // Request the next animation frame to continue the loop.
    this.animationFrameId = requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * Starts the game loop.
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      // Use an arrow function or .bind() to ensure 'this' is correct inside _loop.
      this.animationFrameId = requestAnimationFrame(this._loop.bind(this));
    }
  }
}