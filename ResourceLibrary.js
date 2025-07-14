/**
 * @fileoverview Defines the data for all resource types in the game.
 * This provides a single source of truth for resource properties.
 */

export const ResourceLibrary = {
  IRON: {
    id: 'Iron',
    name: 'Iron',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#5E6971', params: [ [-0.3, -0.1], [0.3, -0.1], [0.35, 0.1], [0.2, 0.3], [-0.2, 0.3], [-0.35, 0.1] ] },
      ],
    },
  },
  FISH: {
    id: 'Fish',
    name: 'Fish',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#4682B4', params: [ [-0.4, 0], [0, -0.2], [0.2, 0], [0, 0.2] ] },
        { type: 'polygon', fillStyle: '#4682B4', params: [ [0.2, 0], [0.4, -0.2], [0.4, 0.2] ] },
      ],
    },
  },
  GRAIN: {
    id: 'Grain',
    name: 'Grain',
    draw: {
      type: 'shapes',
      strokeStyle: '#DAA520',
      lineWidth: 2,
      useSizeFactor: true,
      shapes: [
        { type: 'arc', params: [-0.2, 0.4, 0.5, -Math.PI / 2, -Math.PI / 4] },
        { type: 'arc', params: [0, 0.4, 0.5, -Math.PI / 2, -Math.PI / 3] },
        { type: 'arc', params: [0.2, 0.4, 0.5, -Math.PI / 2, -Math.PI / 2.5] },
      ],
    },
  },
  WOOD: {
    id: 'Wood',
    name: 'Wood',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'rect', fillStyle: '#8B4513', params: [-0.4, -0.1, 0.8, 0.2] },
        { type: 'rect', fillStyle: '#A0522D', params: [-0.3, 0.1, 0.7, 0.2] },
      ],
    },
  },
  STONE: {
    id: 'Stone',
    name: 'Stone',
    draw: {
      type: 'shapes',
      useSizeFactor: true,
      shapes: [
        { type: 'polygon', fillStyle: '#A9A9A9', params: [ [-0.3, -0.1], [0, -0.3], [0.2, 0], [-0.1, 0.2] ] },
        { type: 'polygon', fillStyle: '#808080', params: [ [0.1, 0.1], [0.4, 0.2], [0.2, 0.4] ] },
      ],
    },
  },
};