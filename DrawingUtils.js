/**
 * @fileoverview Provides static utility functions for drawing common shapes.
 * This centralizes drawing logic used by the Renderer and UIManager.
 */

export default class DrawingUtils {
  /**
   * Creates the path for a pointy-top hexagon. Does not fill or stroke.
   * @param {CanvasRenderingContext2D} ctx The rendering context.
   * @param {number} cx The center x-coordinate.
   * @param {number} cy The center y-coordinate.
   * @param {number} size The radius of the hexagon.
   */
  static drawHexPath(ctx, cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // Angle for pointy-top hex. -90 degrees or -PI/2 radians to start at the top.
      const angle_deg = 60 * i - 90;
      const angle_rad = (Math.PI / 180) * angle_deg;
      const vx = cx + size * Math.cos(angle_rad);
      const vy = cy + size * Math.sin(angle_rad);
      if (i === 0) {
        ctx.moveTo(vx, vy);
      } else {
        ctx.lineTo(vx, vy);
      }
    }
    ctx.closePath();
  }

  /**
   * Draws detailed graphics for a drawable object (like a biome, feature, or building).
   * This method interprets the 'draw' property of a drawable object.
   * @param {CanvasRenderingContext2D} ctx The rendering context to draw on.
   * @param {object} drawable The object containing drawing instructions.
   * @param {number} cx The center x-coordinate of the hex.
   * @param {number} cy The center y-coordinate of the hex.
   * @param {number} hexSize The size (radius) of the hex, used for scaling.
   */
  static drawDetails(ctx, drawable, cx, cy, hexSize) {
    if (!drawable.draw) return;

    ctx.save();
    ctx.translate(cx, cy);

    if (drawable.draw.type === 'shapes') {
      for (const shape of drawable.draw.shapes) {
        ctx.beginPath();

        ctx.fillStyle = shape.fillStyle || 'transparent';
        ctx.strokeStyle = shape.strokeStyle || drawable.draw.strokeStyle || 'transparent';
        ctx.lineWidth = shape.lineWidth || drawable.draw.lineWidth || 1;

        // Make a copy of params to avoid mutating the library object.
        let params = [...shape.params];

        // Scale parameters if useSizeFactor is true.
        if (drawable.draw.useSizeFactor) {
          if (shape.type === 'circle') { // params: [cx, cy, radius]
            params = params.map(p => p * hexSize);
          } else if (shape.type === 'arc') { // params: [cx, cy, radius, startAngle, endAngle]
            // Only scale position and radius, not angles
            params[0] *= hexSize;
            params[1] *= hexSize;
            params[2] *= hexSize;
          } else if (shape.type === 'rect') { // params: [x, y, w, h]
            params = params.map(p => p * hexSize);
          } else if (shape.type === 'polygon') { // params: [[x1, y1], [x2, y2], ...]
            params = params.map(p => [p[0] * hexSize, p[1] * hexSize]);
          }
        }

        if (shape.type === 'arc') {
          const [arcX, arcY, radius, startAngle, endAngle] = params;
          ctx.arc(arcX, arcY, radius, startAngle, endAngle);
        } else if (shape.type === 'rect') {
          const [rectX, rectY, width, height] = params;
          ctx.rect(rectX, rectY, width, height);
        } else if (shape.type === 'circle') {
          const [circX, circY, radius] = params;
          ctx.arc(circX, circY, radius, 0, 2 * Math.PI);
        } else if (shape.type === 'polygon') {
          const points = params;
          if (points && points.length > 1) {
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
          }
        }

        if (ctx.fillStyle !== 'transparent') ctx.fill();
        if (ctx.strokeStyle !== 'transparent') ctx.stroke();
      }
    }
    ctx.restore();
  }
}