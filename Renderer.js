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
   * @param {HTMLCanvasElement} canvas The main canvas element to draw on.
   * @param {HTMLCanvasElement} overlayCanvas The overlay canvas for previews.
   * @param {number} hexSize The size (radius) of a single hexagon tile from its center to a corner.
   * @param {import('./EventEmitter.js').default} eventEmitter The central event bus.
   * @param {import('./Map.js').default} map The game map.
   */
  constructor(canvas, overlayCanvas, hexSize, eventEmitter, map) {
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
     * The overlay canvas element for previews.
     * @type {HTMLCanvasElement}
     */
    this.overlayCanvas = overlayCanvas;
    /**
     * The 2D rendering context for the overlay canvas.
     * @type {CanvasRenderingContext2D}
     */
    this.overlayCtx = overlayCanvas.getContext('2d');

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

    // Listen for requests to draw the placement preview on the overlay canvas.
    this.eventEmitter.on('PLACEMENT_PREVIEW_REQUESTED', (payload) => {
      this.drawPlacementPreview(payload);
    });
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

    DrawingUtils.drawHexPath(this.ctx, cx, cy, this.hexSize);

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
    const definingTileCoords = HexGridUtils.getTilesForVertex(vertexId);

    // 1. Find an "anchor" tile that is guaranteed to be on the map.
    // This is the key to correctly calculating vertices on the map's edge.
    const anchorTile = definingTileCoords
      .map(coord => map.getTileAt(coord.x, coord.y))
      .find(tile => tile !== null);

    // If no tile for this vertex is on the map, we can't calculate its position.
    if (!anchorTile) {
      return null;
    }

    // 2. Determine which corner of the anchor tile this vertex represents.
    // A vertex is defined by an anchor tile and two of its neighbors.
    // We find the indices of the other two defining tiles in the anchor's neighbor list.
    const anchorCoordStr = `${anchorTile.x},${anchorTile.y}`;
    const otherCoords = definingTileCoords.filter(c => `${c.x},${c.y}` !== anchorCoordStr);

    const neighborCoords = HexGridUtils.getNeighbors(anchorTile.x, anchorTile.y);
    const neighborIndices = [];

    for (const other of otherCoords) {
      const index = neighborCoords.findIndex(n => n.x === other.x && n.y === other.y);
      if (index !== -1) {
        neighborIndices.push(index);
      }
    }

    // A vertex must be defined by two adjacent neighbors. If not, the vertexId is malformed.
    if (neighborIndices.length !== 2) {
      console.warn(`Could not determine corner for vertex ${vertexId} on tile (${anchorTile.x}, ${anchorTile.y}). The defining tiles may not be contiguous. Found ${neighborIndices.length} neighbors instead of 2.`);
      return null;
    }

    // Sort for consistent matching, e.g., [0, 5] is the same as [5, 0].
    neighborIndices.sort((a, b) => a - b);
    const key = `${neighborIndices[0]},${neighborIndices[1]}`;

    let cornerIndex = -1;
    // This mapping is based on the neighbor order in HexGridUtils (E,SE,SW,W,NW,NE) and
    // the corner drawing order in Renderer.drawHexTile (pointy-top).
    // The cornerIndex must match the loop index 'i' in drawHexTile to get the correct angle.
    // Corners (i): 0:Top, 1:T-R, 2:B-R, 3:Bottom, 4:B-L, 5:T-L
    switch (key) {
      case '4,5': cornerIndex = 0; break; // NW(4), NE(5) -> Top corner
      case '0,5': cornerIndex = 1; break; // E(0), NE(5)  -> Top-Right corner
      case '0,1': cornerIndex = 2; break; // E(0), SE(1)  -> Bottom-Right corner
      case '1,2': cornerIndex = 3; break; // SE(1), SW(2) -> Bottom corner
      case '2,3': cornerIndex = 4; break; // SW(2), W(3)  -> Bottom-Left corner
      case '3,4': cornerIndex = 5; break; // W(3), NW(4)  -> Top-Left corner
      default:
        console.error(`Invalid neighbor pair [${key}] for vertex calculation on vertex ${vertexId}.`);
        return null;
    }

    // 3. Calculate the corner's exact pixel coordinates using trigonometry.
    const { x: cx, y: cy } = this.tileToPixel(anchorTile);
    // The angle calculation MUST match the one used in drawHexTile for consistency.
    const angle_deg = 60 * cornerIndex - 90;
    const angle_rad = (Math.PI / 180) * angle_deg;
    const vx = cx + this.hexSize * Math.cos(angle_rad);
    const vy = cy + this.hexSize * Math.sin(angle_rad);

    return { x: vx, y: vy };
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

    this.ctx.save();
    const style = Config.tileOutlineStyle;
    this.ctx.strokeStyle = style.strokeStyle;
    this.ctx.lineWidth = style.lineWidth;
    this.ctx.setLineDash(Config.tileOutlineDash);
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
      this.ctx.closePath(); // Connect the last point back to the first.
      
      this.ctx.stroke();
    }
    this.ctx.restore();
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

    // Restore the context to its original state
    this.ctx.restore();
  }

  /**
   * Clears any temporary drawings from the overlay canvas.
   */
  clearPlacementPreview() {
    if (this.overlayCanvas && this.overlayCtx) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
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
      const ctx = this.overlayCtx;
      const { x: offsetX, y: offsetY } = this.getTranslationOffset();
      const { x: tileX, y: tileY } = this.tileToPixel(tile);
      const hexSize = this.hexSize;

      ctx.fillStyle = shadeColor;
      DrawingUtils.drawHexPath(ctx, tileX + offsetX, tileY + offsetY, hexSize);
      ctx.fill();
    }

    // --- 3. Draw Building Icon ---
    // We draw the icon of the building that *would* be placed, including transformations.
    const buildingDef = BuildingDefinitionMap.get(placementInfo.resolvedBuildingId);
    if (buildingDef?.draw) {
      const ctx = this.overlayCtx;
      const { x: offsetX, y: offsetY } = this.getTranslationOffset();
      const { x: tileX, y: tileY } = this.tileToPixel(tile);
      const hexSize = this.hexSize;

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

      const ctx = this.overlayCtx;
      const { x: offsetX, y: offsetY } = this.getTranslationOffset();

      ctx.save();
      ctx.translate(offsetX, offsetY); // Apply the same offset as the main renderer.

      const perimeterVertexIds = HexGridUtils.getOuterPerimeter(tilesToOutline, this.map);
      const perimeterPixels = perimeterVertexIds.map(vId => this._getVertexPixelCoords(vId, this.map)).filter(Boolean);

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
}