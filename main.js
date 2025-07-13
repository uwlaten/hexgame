/**
 * @fileoverview This is the main entry point for the application.
 * It sets up the game map, renderer, and game loop, and kicks off the process.
 */

import Map from './Map.js';
import MapGenerator from './MapGenerator.js';
import Renderer from './Renderer.js';
import GameLoop from './GameLoop.js';
import EventEmitter from './EventEmitter.js';
import Player from './Player.js';
import Game from './Game.js';
import UI from './UI.js';
import InputHandler from './InputHandler.js';
import Config from './Config.js';

/**
 * The main function to run the application.
 * This function is wrapped in a DOMContentLoaded event listener to ensure
 * the canvas element is available before we try to use it.
 */
function main() {
  // --- 1. SETUP ---
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Fatal: Canvas element with id "gameCanvas" not found.');
    return;
  }

  const hexSize = 15; // The radius of a hex tile in pixels.
  const headerHeight = 60; // The height of the UI header area in pixels.

  // --- 2. INITIALIZATION ---
  // The event emitter is the central hub for game events.
  const eventEmitter = new EventEmitter();
  const player = new Player();

  const gameMap = new Map();
  MapGenerator.generate(gameMap);

  // Create the renderer instance first. It is now the source of truth for
  // all layout and sizing calculations.
  const renderer = new Renderer(canvas, hexSize, headerHeight);

  // Ask the renderer for the required canvas size and apply it.
  // This decouples the main script from layout-specific calculations.
  const dimensions = renderer.getRequiredCanvasDimensions(gameMap);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height + headerHeight;

  // The input handler translates raw browser events into game events.
  const inputHandler = new InputHandler(canvas, eventEmitter, renderer, gameMap);
  inputHandler.init(); // Attaches the click listener

  // The Game class orchestrates the main game logic.
  const game = new Game(eventEmitter, player);
  game.init();

  // The UI class handles drawing interface elements like scores and menus.
  const ui = new UI(renderer.ctx, player, hexSize, headerHeight);

  const gameLoop = new GameLoop(renderer, gameMap, ui);

  // --- 3. START THE GAME ---
  // The game loop will now handle all rendering.
  gameLoop.start();
}

// Wait for the HTML document to be fully loaded before running the main function.
document.addEventListener('DOMContentLoaded', main);