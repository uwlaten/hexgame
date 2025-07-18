/**
 * @fileoverview Defines the Renderer class for drawing the game state onto a canvas.
 */
import HexGridUtils from './HexGridUtils.js';
import DrawingUtils from './DrawingUtils.js';
import Config from './Config.js';
import HexTile from './HexTile.js';
import { Building } from './Building.js';
import { BuildingDefinitionMap } from './BuildingLibrary.js';
import { Resource } from './Resource.js';
import { ResourceLibrary } from './ResourceLibrary.js';

/**
 * Handles all drawing operations on the HTML canvas.
 */
export default class Renderer {
  /**
   * Creates an instance of the Renderer.
   * @param {HTMLCanvasElement} canvas The canvas element to draw on.
   * @param {number} hexSize The size (radius) of a single hexagon tile from its center to a corner.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Map.js').default} map The game map.
   */
  constructor(canvas, hexSize, eventEmitter, map) {
    /**
     * The HTML canvas element.
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;
    /**
     * @type {import('./EventEmitter.js').default}
     */
    this.eventEmitter = eventEmitter;
    /** @type {import('./Map.js').default} */
    this.map = map;

    /**
     * The 2D rendering context for the canvas.
     * @type {CanvasRenderingContext2D}
     */
    this.ctx = canvas.getContext('2d');

    /**
     * The size (radius) of a hexagon from its center to a corner.
     * @type {number}
     */
    this.hexSize = hexSize;

    /**
     * Padding around the map in pixels to prevent border clipping.
     * @type {number}
     * @private
     */
    this._padding = Config.RendererConfig.padding;

    /**
     * Stores groups of tiles that need a persistent outline. Each group is an array of HexTile objects.
     * @type {HexTile[][]}
     */
    this.outlinedTileGroups = [];
  }

  /**
   * Initializes the renderer by setting up event listeners.
   */
  init() {
    // Subscribe to the MAP_STATE_CHANGED event. This will become the primary
    // trigger for redrawing the entire map when the game's logical state changes.
    this.eventEmitter.on('MAP_STATE_CHANGED', () => {
      this.drawMap(this.map);
    });
  }

  /**
   * Adds a group of tiles to be outlined on subsequent draws.
   * @param {HexTile[]} tiles An array of tiles that form a single outlined group.
   */
  addOutlinedGroup(tiles) {
    this.outlinedTileGroups.push(tiles);
  }

  /**
   * Clears all persistent outlines. Called when starting a new game.
   */
  clearOutlines() {
    this.outlinedTileGroups = [];
  }

  /**
   * Calculates the pixel coordinates of a tile's center.
   * @param {HexTile} tile The tile to calculate coordinates for.
   * @returns {{x: number, y: number}} The pixel coordinates of the tile's center.
   */
  tileToPixel(tile) {
    const cx = this.hexSize * Math.sqrt(3) * (tile.x + 0.5 * (tile.y & 1));
    const cy = this.hexSize * (3 / 2) * tile.y;
    return { x: cx, y: cy };
  }

  /**
   * Gets the translation offset used when drawing the map.
   * This is needed to align drawings on an overlay canvas.
   * @returns {{x: number, y: number}} The x and y translation offset.
   */
  getTranslationOffset() {
    const x = (this.hexSize * Math.sqrt(3)) / 2 + this._padding;
    const y = this.hexSize + this._padding;
    return { x, y };
  }

  /**
   * Draws a single hexagonal tile on the canvas.
   * @param {HexTile} tile The HexTile object to draw.
   */
  drawHexTile(tile) {
    const { x: cx, y: cy } = this.tileToPixel(tile);

    const color = tile.biome.color || '#cccccc'; // Use the color from the biome object.

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // The angle for the first vertex is -90 degrees for a pointy-top hexagon,
      // which now matches our coordinate system.
      const angle_deg = 60 * i - 90;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const vx = cx + this.hexSize * Math.cos(angle_rad);
      const vy = cy + this.hexSize * Math.sin(angle_rad);
      if (i === 0) {
        this.ctx.moveTo(vx, vy);
      } else {
        this.ctx.lineTo(vx, vy);
      }
    }
    this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Add a border to each hex
    const borderStyle = Config.RendererConfig.hexBorderStyle;
    this.ctx.strokeStyle = borderStyle.strokeStyle;
    this.ctx.lineWidth = borderStyle.lineWidth;
    this.ctx.stroke();

    // If the biome itself has special drawing instructions (like waves on water), draw them.
    if (tile.biome.draw) {
      DrawingUtils.drawDetails(this.ctx, tile.biome, cx, cy, this.hexSize);
    }

    // If the tile has a feature (like hills), draw it on top of the biome.
    if (tile.feature?.draw) {
      DrawingUtils.drawDetails(this.ctx, tile.feature, cx, cy, this.hexSize);
    }

    // If the tile has content (like a building or resource), draw it.
    if (tile.contentType instanceof Building) {
      // For Buildings, we look up the definition in the library by type.
      const buildingDef = BuildingDefinitionMap.get(tile.contentType.type);
            
      if (buildingDef?.draw) {
        DrawingUtils.drawDetails(this.ctx, buildingDef, cx, cy, this.hexSize);
      }
    } else if (tile.contentType instanceof Resource) {
      // For Resources, we also need to look up the visual definition in the library,
      // but we use the resource's `type` property as the key.
      const resourceDef = ResourceLibrary[tile.contentType.type.toUpperCase()];
      if (resourceDef?.draw) {
        DrawingUtils.drawDetails(this.ctx, resourceDef, cx, cy, this.hexSize);

        // --- NEW: Draw a "claimed" indicator if the resource has been claimed. ---
        if (tile.contentType.isClaimed) {
          this.ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'; // Semi-transparent grey
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, this.hexSize * 0.4, 0, 2 * Math.PI); // Slightly smaller circle
          this.ctx.fill();
          // Alternatively, draw an 'X':
          // DrawingUtils.drawX(this.ctx, cx, cy, this.hexSize * 0.5, 'rgba(0,0,0,0.8)', 2);
        }
      }
    }
  }

  /**
   * Draws an outline around a set of tiles, excluding shared edges.
   * @param {HexTile[]} tiles An array of HexTile objects to outline.
   * @param {Object} style The style object for the outline (strokeStyle, lineWidth).
   * @param {CanvasRenderingContext2D} [ctx=this.ctx] The rendering context to draw on. Defaults to the main canvas context.
   */
  tileOutline(tiles, style, ctx = this.ctx) {
    if (!tiles || tiles.length === 0) return;

    const edgeIds = new Set();

    // 1. Collect all edge IDs for the given tiles.
    for (const tile of tiles) {
      const vertexIds = HexGridUtils.getVerticesForTile(tile, this.map);
      for (let i = 0; i < vertexIds.length; i++) {
        const vertexId1 = vertexIds[i];
        const vertexId2 = vertexIds[(i + 1) % vertexIds.length];
        const edgeId = HexGridUtils.getEdgeId(vertexId1, vertexId2);
        edgeIds.add(edgeId);
      }
    }

    // 2. Identify and remove shared edges (duplicates).
    const uniqueEdgeIds = new Set(edgeIds);
    const edgesToDraw = [];

    for (const edgeId of uniqueEdgeIds) {
      let count = 0;
      for (const tile of tiles) {
        const vertexIds = HexGridUtils.getVerticesForTile(tile, this.map);
        for (let i = 0; i < vertexIds.length; i++) {
          const vertexId1 = vertexIds[i];
          const vertexId2 = vertexIds[(i + 1) % vertexIds.length];
          const currentEdgeId = HexGridUtils.getEdgeId(vertexId1, vertexId2);
          if (currentEdgeId === edgeId) {
            count++;
          }
        }
      }
      if (count === 1) {
        edgesToDraw.push(edgeId); // Only draw if the edge appears once (not shared)
      }
    }

    // 3. Draw the non-shared edges.
    ctx.save(); // Save the current context state
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    ctx.setLineDash(Config.tileOutlineDash);


    for (const edgeId of edgesToDraw) {      
      const [vertexId1, vertexId2] = HexGridUtils.getVerticesForEdge(edgeId);
      const p1 = this._getVertexPixelCoords(vertexId1, this.map);
      const p2 = this._getVertexPixelCoords(vertexId2, this.map);
      
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.restore();    
  }

  

  /**
   * Calculates the required canvas dimensions to fit the entire map, including padding.
   * This makes the Renderer the single source of truth for layout calculations.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{width: number, height: number}} The required width and height in pixels.
   */
  getRequiredCanvasDimensions(map) {
    // Calculate the pixel dimensions of the hex grid itself.
    // This is for a "pointy-top, odd-r" layout.
    const mapPixelWidth = (map.width + 0.5) * this.hexSize * Math.sqrt(3);
    const mapPixelHeight = (1.5 * map.height + 0.5) * this.hexSize;

    // Add padding to both dimensions to ensure borders are not clipped.
    return {
      width: Math.ceil(mapPixelWidth + this._padding * 2),
      height: Math.ceil(mapPixelHeight + this._padding * 2),
    };
  }

  /**
   * Converts pixel coordinates from the canvas to hexagonal grid coordinates.
   * This implementation is based on the excellent guide from Red Blob Games.
   * @param {number} pixelX The x-coordinate of the click on the canvas.
   * @param {number} pixelY The y-coordinate of the click on the canvas.
   * @returns {{x: number, y: number}} The grid coordinates (column, row) of the hex.
   */
  pixelToHex(pixelX, pixelY) {
    // 1. Adjust for the canvas translation applied during rendering.
    const translateX = (this.hexSize * Math.sqrt(3)) / 2 + this._padding; 
    const translateY = this.hexSize + this._padding;
    const worldX = pixelX - translateX; 
    const worldY = pixelY - translateY;

    // 2. Convert world pixel coordinates to fractional axial coordinates (q, r).
    // This is for pointy-top hexes.
    const q = ((Math.sqrt(3) / 3) * worldX - (1 / 3) * worldY) / this.hexSize;
    const r = ((2 / 3) * worldY) / this.hexSize;

    // 3. Convert fractional axial to fractional cube coordinates (x, y, z).
    const x = q;
    const z = r;
    const y = -x - z;

    // 4. Round cube coordinates to the nearest integer hex.
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const x_diff = Math.abs(rx - x);
    const y_diff = Math.abs(ry - y);
    const z_diff = Math.abs(rz - z);

    if (x_diff > y_diff && x_diff > z_diff) {
      rx = -ry - rz;
    } else if (y_diff > z_diff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    // 5. Convert the rounded cube coordinates back to "odd-r" offset coordinates.
    const col = rx + (rz - (rz & 1)) / 2;
    const row = rz;

    return { x: col, y: row };
  }

  /**
   * Calculates the pixel coordinates of a vertex by averaging its surrounding tile centers.
   * @param {string} vertexId The unique ID of the vertex.
   * @param {import('./Map.js').default} map The map object.
   * @returns {{x: number, y: number}|null} The pixel coordinates, or null if invalid.
   * @private
   */
  _getVertexPixelCoords(vertexId, map) {
    const tileCoords = HexGridUtils.getTilesForVertex(vertexId);
    if (tileCoords.length !== 3) return null;

    let totalX = 0;
    let totalY = 0;

    for (const coord of tileCoords) {
      const tile = map.getTileAt(coord.x, coord.y);
      if (!tile) return null; // Vertex is partially off-map

      const { x: px, y: py } = this.tileToPixel(tile);
      totalX += px;
      totalY += py;
    }

    return { x: totalX / 3, y: totalY / 3 };
  }

  /**
   * Draws all the rivers stored in the map's river data set.
   * @param {import('./Map.js').default} map The map object.
   * @private
   */
  _drawRivers(map) {
    if (map.rivers.size === 0) return;

    const riverStyle = Config.RendererConfig.riverStyle;
    this.ctx.strokeStyle = riverStyle.strokeStyle;
    this.ctx.lineWidth = riverStyle.lineWidth;
    this.ctx.lineCap = riverStyle.lineCap;
    this.ctx.lineJoin = riverStyle.lineJoin;

    for (const edgeId of map.rivers) {
      const [vertexId1, vertexId2] = HexGridUtils.getVerticesForEdge(edgeId);

      const p1 = this._getVertexPixelCoords(vertexId1, map);
      const p2 = this._getVertexPixelCoords(vertexId2, map);

      if (p1 && p2) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Draws outlines around linked claimed resources using the offset strategy.
   * @param {import('./Map.js').default} map The map object.
   * @private
   */
  _drawClaimOutlines(map) {
    if (map.claimedLinks.size === 0) return;

    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const offset = 2; // How many pixels to draw the line inside the perimeter.

    for (const link of map.claimedLinks) {
      const { buildingTile, resourceTile } = link;

      const perimeterVertexIds = HexGridUtils.getOuterPerimeter([buildingTile, resourceTile], map);
      if (perimeterVertexIds.length === 0) continue;

      const perimeterPixels = perimeterVertexIds.map(vId => this._getVertexPixelCoords(vId, map)).filter(Boolean);

      if (perimeterPixels.length < 2) continue;

      //console.log("Perimeter Pixels:", perimeterPixels);

      // Calculate the geometric center (centroid) of the combined shape.
      // We will offset each point towards this centroid.
      const centroid = perimeterPixels.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      centroid.x /= perimeterPixels.length;
      centroid.y /= perimeterPixels.length;

      this.ctx.beginPath();

      for (let i = 0; i < perimeterPixels.length; i++) {
        const point = perimeterPixels[i];
        //console.log("i", i);
        // Calculate the vector from the current point towards the centroid.
        const vectorX = centroid.x - point.x;
        const vectorY = centroid.y - point.y;

        // Normalize the vector to get a direction.
        const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
        if (magnitude === 0) continue; // Should not happen, but safe to check.
        const directionX = vectorX / magnitude;
        const directionY = vectorY / magnitude;

        // Calculate the new, offset point.
        const offsetX = point.x + directionX * offset;
        const offsetY = point.y + directionY * offset;

        i === 0 ? this.ctx.moveTo(offsetX, offsetY) : this.ctx.lineTo(offsetX, offsetY);
      }
      
      this.ctx.stroke();
    }
  }

  /**
   * Clears the canvas and draws the entire map.
   * @param {import('./Map.js').default} map The map object to draw.
   */
  drawMap(map) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save the current context state (e.g., transformations)
    this.ctx.save();

    // Translate the context to center the map within the padded canvas.
    // The first part of the translation aligns the grid's geometric edge.
    // The padding part ensures the stroke is not clipped.
    this.ctx.translate(
      (this.hexSize * Math.sqrt(3)) / 2 + this._padding, 
      this.hexSize + this._padding
    );

    for (const row of map.grid) {
      for (const tile of row) {
        this.drawHexTile(tile);
      }
    }

    // Draw the claim outlines on top of the tiles.
    this._drawClaimOutlines(map);

    // Draw rivers on top of tiles and outlines.
    this._drawRivers(map);

    // Draw persistent outlines for claimed resources, etc.
    if (this.outlinedTileGroups.length > 0) {
      for (const group of this.outlinedTileGroups) {
        this.tileOutline(group, Config.tileOutlineStyle);
      }
    }

    // Restore the context to its original state
    this.ctx.restore();
  }
}