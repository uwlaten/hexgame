/**
 * @fileoverview Defines the data for all building types in the game.
 * This provides a single source of truth for building properties.
 */

export const BuildingLibrary = {
  RESIDENCE: {
    id: 'Residence',
    name: 'Residence',
    draw: {
      type: 'shapes',
      shapes: [
        {
          type: 'circle',
          fillStyle: '#8B4513', // SaddleBrown
          params: [0, 0, 0.5], // cx, cy, radiusFactor
          useSizeFactor: true,
        },
      ],
    },
    // Future properties can be added here:
    // cost: { wood: 50, stone: 20 },
    // provides: { housing: 5 },
  },
  // Other building types like 'LUMBER_MILL', 'FARM', etc., can be added here.
};