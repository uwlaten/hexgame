/**
 * @fileoverview This is the main entry point for the application.
 * It sets up the game map, renderer, and game loop, and kicks off the process.
 */

import Map from './Map.js';
import MapGenerator from './MapGenerator.js';
import Renderer from './Renderer.js';
import EventEmitter from './EventEmitter.js';
import Player from './Player.js';
import Game from './Game.js'; 
import UIManager from './UIManager.js';
import InputHandler from './InputHandler.js';
import ScoringEngine from './ScoringEngine.js';
import Config from './Config.js';

// This object will hold our canvas and context references for easy access
// from other parts of the application.
export const renderContext = {
    main: {
        canvas: null,
        ctx: null,
    },
    overlay: {
        canvas: null,
        ctx: null,
    }
};

/**
 * The main function to run the application.
 * This function is wrapped in a DOMContentLoaded event listener to ensure
 * the canvas element is available before we try to use it.
 */
function main() {
  // --- 1. SETUP ---
  renderContext.main.canvas = document.getElementById('gameCanvas');
  renderContext.overlay.canvas = document.getElementById('game-overlay');

  if (!renderContext.main.canvas) {
    console.error('Fatal: Canvas element with id "gameCanvas" not found.');
    return;
  }
  if (!renderContext.overlay.canvas) {
    console.error('Fatal: Canvas element with id "game-overlay" not found.');
    return;
  }

  // --- 2. INITIALIZATION ---
  // The event emitter is the central hub for game events.
  const eventEmitter = new EventEmitter();

  // The UIManager handles all HTML UI elements. It must be initialized
  // before other components that emit UI-related events.
  const uiManager = new UIManager(eventEmitter);
  uiManager.init();

  const player = new Player(eventEmitter); // Player emits its initial state.

  const gameMap = new Map();
  const initialOptions = uiManager.getGenerationOptions();
  const generationLog = MapGenerator.generate(gameMap, initialOptions);

  // Manually reset the player with the initial map to generate the scaled deck.
  player.reset(gameMap);

  // Print the generation log to the console for debugging.
  console.groupCollapsed('Initial Map Generation Log');
  for (const message of generationLog) {
    console.log(message);
  }
  console.groupEnd();

  // Create the renderer instance first. It is now the source of truth for
  // all layout and sizing calculations.
  const renderer = new Renderer(renderContext.main.canvas, Config.RendererConfig.hexSize, eventEmitter, gameMap);
  renderer.init();

  // Ask the renderer for the required canvas size and apply it.
  // This decouples the main script from layout-specific calculations.
  const dimensions = renderer.getRequiredCanvasDimensions(gameMap);
  renderContext.main.canvas.width = dimensions.width;
  renderContext.main.canvas.height = dimensions.height;
  renderContext.overlay.canvas.width = dimensions.width;
  renderContext.overlay.canvas.height = dimensions.height;

  // Now that dimensions are set, get the contexts.
  renderContext.main.ctx = renderContext.main.canvas.getContext('2d');
  renderContext.overlay.ctx = renderContext.overlay.canvas.getContext('2d');

  //Draw the map for the first time
  renderer.drawMap(gameMap);

  // The input handler translates raw browser events into game events.
  const inputHandler = new InputHandler(renderContext.main.canvas, eventEmitter, renderer, gameMap);
  inputHandler.init(); // Attaches the click listener

  // The Game class orchestrates the main game logic.
  const game = new Game(eventEmitter, player, gameMap, renderer, uiManager);
  game.init();

  // The ScoringEngine manages all scoring logic.
  const scoringEngine = new ScoringEngine(eventEmitter, player);
  // Register the rules we want to use for this game.
  scoringEngine.init();
}

// Wait for the HTML document to be fully loaded before running the main function.
document.addEventListener('DOMContentLoaded', main);