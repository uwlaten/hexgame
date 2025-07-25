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
      useSizeFactor: true, // Indicates that params should be scaled by hexSize.
      shapes: [
        // An array of shapes to draw, with coordinates as factors of hexSize.
        { type: 'arc', params: [-0.55, -0.2, 0.22, Math.PI, 2 * Math.PI] }, // Top-left
        { type: 'arc', params: [0.55, -0.2, 0.22, Math.PI, 2 * Math.PI] },  // Top-right
        { type: 'arc', params: [0, 0.1, 0.28, Math.PI, 2 * Math.PI] },    // Center
        { type: 'arc', params: [-0.35, 0.6, 0.22, Math.PI, 2 * Math.PI] }, // Bottom-left
        { type: 'arc', params: [0.35, 0.6, 0.22, Math.PI, 2 * Math.PI] },  // Bottom-right
      ],
    },
    possibleResources: [
      { resourceId: 'Stone', chance: 0.15 },
      { resourceId: 'Iron', chance: 0.08 },
    ],
    // Hills should prevent Grain from the underlying biome from spawning.
    biomeResourceInteraction: {
      mode: 'block',
      resourceIds: ['Grain'],
    },
  },
  FOREST: {
    id: 'forest',
    name: 'Forest',
    elevationModifier: 0, // Forests don't change the ground elevation
    possibleResources: [
      {
        resourceId: 'Wood',
        chance: 0.2,
        // This resource can only spawn if the tile is adjacent to at least one other forest tile.
        // This ensures a Woodcutter/Lumbermill can be placed on the adjacent forest to claim it.
        conditions: [{ type: 'neighbor', property: 'feature.id', value: 'forest', operator: 'atLeast', count: 1 }],
      },
    ],
    // Override the default resources for specific biomes.
    resourceOverrides: {
      // When a forest is on these biomes, it produces no resources.
      steppe: [], // Renamed from savannah
      desert: [], // No change
    },
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // A cluster of 5 small fir trees, each with a trunk and canopy.
        // We draw trunks first, then canopies, to ensure correct layering if they overlap.

        // Trunks (Rectangles)
        { type: 'rect', fillStyle: '#8B4513', params: [-0.07, 0.2, 0.13, 0.2] },   // Center
        { type: 'rect', fillStyle: '#8B4513', params: [-0.53, -0.2, 0.13, 0.2] },  // Top-left
        { type: 'rect', fillStyle: '#8B4513', params: [0.4, -0.2, 0.13, 0.2] },   // Top-right
        { type: 'rect', fillStyle: '#8B4513', params: [-0.33, 0.6, 0.13, 0.2] },   // Bottom-left
        { type: 'rect', fillStyle: '#8B4513', params: [0.2, 0.6, 0.13, 0.2] },    // Bottom-right

        // Canopies (Polygons/Triangles)
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-0.27, 0.2], [0.27, 0.2], [0, -0.13] ] },    // Center
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-0.73, -0.2], [-0.2, -0.2], [-0.47, -0.53] ] }, // Top-left
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [0.2, -0.2], [0.73, -0.2], [0.47, -0.53] ] },  // Top-right
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [-0.53, 0.6], [0, 0.6], [-0.27, 0.27] ] },    // Bottom-left
        { type: 'polygon', fillStyle: '#2E8B57', params: [ [0, 0.6], [0.53, 0.6], [0.27, 0.27] ] },     // Bottom-right
      ],
    },
    // Forests should prevent any resource from the underlying biome from spawning.
    biomeResourceInteraction: {
      mode: 'block',
      resourceIds: ['*'], // '*' is a wildcard for all resources.
    },
  },
  OASIS: {
    id: 'oasis',
    name: 'Oasis',
    elevationModifier: 0, // An oasis is flat, it doesn't change tile elevation.
    biomeResourceInteraction: {
      mode: 'block',
      resourceIds: ['*'], // An oasis prevents underlying biome resources (like Gold from Desert) from spawning.
    },
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        // A simple, stylized bean/pond shape to represent the water source.
        {
          type: 'polygon',
          fillStyle: '#63b4cf', // A pleasant blue, similar to Lake color
          strokeStyle: '#4f93a8', // A darker blue for the border
          lineWidth: 2,
          params: [ [-0.4, 0.2], [-0.2, -0.2], [0.2, -0.25], [0.45, 0.0], [0.3, 0.25], [0.0, 0.2] ],
        },
      ],
    },
  },
};