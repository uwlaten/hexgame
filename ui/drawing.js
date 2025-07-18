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

    // Draw the hexagon shape (pointy-top)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        // Start at the top point
        const angle = 2 * Math.PI / 6 * (i - 0.5);
        const x = centerX + hexSize * Math.cos(angle);
        const y = centerY + hexSize * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();

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