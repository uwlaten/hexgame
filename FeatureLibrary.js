/**
 * @fileoverview Defines the data for all feature types in the game.
 * Features are geographical elements that can appear on top of a biome.
 */

export const FeatureLibrary = {
  HILLS: {
    id: 'hills',
    name: 'Hills',
    elevationModifier: 2, // Hills add to the base elevation
    // The 'draw' property contains instructions for the Renderer.
    draw: {
      type: 'shapes', // Tells the renderer to interpret the 'shapes' array.
      strokeStyle: '#A0522D', // Sienna brown for the hill lines.
      lineWidth: 2,
      shapes: [
        // An array of shapes to draw, with coordinates relative to the hex center.
        // Format: { type: 'arc', params: [cx, cy, radius, startAngle, endAngle] }
        { type: 'arc', params: [-8, -2, 4, Math.PI, 2 * Math.PI] },
        { type: 'arc', params: [8, -2, 4, Math.PI, 2 * Math.PI] },
        { type: 'arc', params: [0, 2, 5, Math.PI, 2 * Math.PI] },
        { type: 'arc', params: [-5, 8, 4, Math.PI, 2 * Math.PI] },
        { type: 'arc', params: [5, 8, 4, Math.PI, 2 * Math.PI] },
      ],
    },
  },
  FOREST: {
    id: 'forest',
    name: 'Forest',
    elevationModifier: 0, // Forests don't change the ground elevation
    draw: {
      type: 'shapes',
      shapes: [
        // A cluster of 5 small fir trees, each with a trunk and canopy.
        // We draw trunks first, then canopies, to ensure correct layering if they overlap.

        // Trunks (Rectangles)
        { type: 'rect', fillStyle: '#8B4513', params: [-1, 3, 2, 3] },   // Center
        { type: 'rect', fillStyle: '#8B4513', params: [-8, -3, 2, 3] },  // Top-left
        { type: 'rect', fillStyle: '#8B4513', params: [6, -3, 2, 3] },   // Top-right
        { type: 'rect', fillStyle: '#8B4513', params: [-5, 9, 2, 3] },   // Bottom-left
        { type: 'rect', fillStyle: '#8B4513', params: [3, 9, 2, 3] },    // Bottom-right

        // Canopies (Polygons/Triangles)
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-4, 3], [4, 3], [0, -2] ] },    // Center
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-11, -3], [-3, -3], [-7, -8] ] }, // Top-left
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [3, -3], [11, -3], [7, -8] ] },  // Top-right
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-8, 9], [0, 9], [-4, 4] ] },    // Bottom-left
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [0, 9], [8, 9], [4, 4] ] },     // Bottom-right
      ],
    },
  },
};