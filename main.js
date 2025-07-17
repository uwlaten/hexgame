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
import UIManager from './UIManager.js';
import InputHandler from './InputHandler.js';
import ScoringEngine from './ScoringEngine.js';
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

  // Print the generation log to the console for debugging.
  console.groupCollapsed('Initial Map Generation Log');
  for (const message of generationLog) {
    console.log(message);
  }
  console.groupEnd();

  // Create the renderer instance first. It is now the source of truth for
  // all layout and sizing calculations.
  const renderer = new Renderer(canvas, Config.RendererConfig.hexSize, eventEmitter, gameMap);
  renderer.init();

  // Ask the renderer for the required canvas size and apply it.
  // This decouples the main script from layout-specific calculations.
  const dimensions = renderer.getRequiredCanvasDimensions(gameMap);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  // The input handler translates raw browser events into game events.
  const inputHandler = new InputHandler(canvas, eventEmitter, renderer, gameMap);
  inputHandler.init(); // Attaches the click listener

  // The Game class orchestrates the main game logic.
  const game = new Game(eventEmitter, player, gameMap, renderer, uiManager);
  game.init();

  // The ScoringEngine manages all scoring logic.
  const scoringEngine = new ScoringEngine(eventEmitter, player);
  // Register the rules we want to use for this game.

  const gameLoop = new GameLoop(renderer, gameMap);

  // --- 3. START THE GAME ---
  // The game loop will now handle all rendering.
  gameLoop.start();
}

// Wait for the HTML document to be fully loaded before running the main function.
document.addEventListener('DOMContentLoaded', main);