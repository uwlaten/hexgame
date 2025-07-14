/**
 * @fileoverview Provides static utility functions for drawing common shapes.
 * This centralizes drawing logic used by the Renderer and UIManager.
 */

export default class DrawingUtils {
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
          if (shape.type === 'circle' || shape.type === 'arc') { // params: [cx, cy, radiusFactor]
            params = params.map(p => p * hexSize);
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