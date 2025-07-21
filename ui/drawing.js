import DrawingUtils from '../DrawingUtils.js';

/**
 * Draws the "END" indicator on a given canvas.
 * This is used for the "Next Tile" preview when the deck is empty.
 * @param {HTMLCanvasElement} canvas The canvas element to draw on.
 */
export function drawEndIndicator(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Make the hex slightly smaller than the canvas to leave a margin
    const hexSize = Math.min(canvas.width, canvas.height) / 2 * 0.85;

    // Clear any previous content
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use the canonical utility to draw a pointy-top hexagon path.
    DrawingUtils.drawHexPath(ctx, centerX, centerY, hexSize);

    // Fill and stroke the hexagon
    ctx.fillStyle = '#888888'; // A neutral grey
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the "END" text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('END', centerX, centerY);
}

// adding a comment so I can save this