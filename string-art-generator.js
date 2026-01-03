/**
 * String Art Generator Library
 * 
 * A standalone library to generate string art sequences from images.
 * This file contains the core algorithmic logic decoupled from the DOM/UI.
 * 
 * Usage:
 * 1. Instantiate the generator: `const gen = new StringArtGenerator(width, height);`
 * 2. Setup pins: `gen.initPins(200, 'circle');`
 * 3. Load image: `gen.loadImage(imgData);`
 * 4. Generate: `gen.generateSteps(10);` (call repeatedly)
 */

const StringArtGenerator = class {
    /**
     * @param {number} width - Computation width (e.g. 500 or 1000)
     * @param {number} height - Computation height
     */
    constructor(width = 500, height = 500) {
        this.width = width;
        this.height = height;
        this.pins = [];
        this.sequence = []; // 0-based pin indices
        this.pixels = null; // Uint8Array representing the "error" (darkness remaining)
        this.currentPin = 0;
    }

    /**
     * Initializes the pin coordinates around the frame.
     * @param {number} numPins - Total number of pins (e.g. 200).
     * @param {string} shape - 'circle' or 'square'.
     */
    initPins(numPins, shape = 'circle') {
        this.pins = [];
        const cx = this.width / 2;
        const cy = this.height / 2;
        const margin = 1;

        if (shape === 'circle') {
            const radius = (Math.min(this.width, this.height) / 2) - margin;
            for (let i = 0; i < numPins; i++) {
                // Start from -PI/2 (12 o'clock)
                const angle = (2 * Math.PI * i) / numPins - (Math.PI / 2);
                this.pins.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        } else {
            // Square
            const w = this.width - 2 * margin;
            const h = this.height - 2 * margin;
            const x0 = margin;
            const y0 = margin;
            const perimeter = 2 * (w + h);
            const step = perimeter / numPins;

            for (let i = 0; i < numPins; i++) {
                let d = (i * step) % perimeter;
                let x, y;

                if (d < w) { // Top Edge
                    x = x0 + d;
                    y = y0;
                } else if (d < w + h) { // Right Edge
                    x = x0 + w;
                    y = y0 + (d - w);
                } else if (d < 2 * w + h) { // Bottom Edge
                    x = x0 + w - (d - (w + h));
                    y = y0 + h;
                } else { // Left Edge
                    x = x0;
                    y = y0 + h - (d - (2 * w + h));
                }
                this.pins.push({ x, y });
            }
        }

        // Reset state
        this.sequence = [0];
        this.currentPin = 0;
    }

    /**
     * Loads image data into the generator.
     * @param {Uint8ClampedArray} pixelData - RGBA or Gray pixel data.
     * @param {boolean} isRGBA - Set to true if data is RGBA (4 channels), false if already grayscale (1 channel).
     */
    loadImage(pixelData, isRGBA = true) {
        if (isRGBA) {
            // Convert RGBA to Grayscale Error Map
            // 0 = white/empty, 255 = black/full string needed
            this.pixels = new Uint8Array(this.width * this.height);
            for (let i = 0; i < pixelData.length; i += 4) {
                // Calculate brightness (human perception)
                const brightness = 0.299 * pixelData[i] + 0.587 * pixelData[i + 1] + 0.114 * pixelData[i + 2];
                // Invert and store
                this.pixels[i / 4] = 255 - brightness;
            }
        } else {
            // Assume input is already inverted grayscale (0=white, 255=black)
            this.pixels = new Uint8Array(pixelData);
        }
    }

    /**
     * Convenience method to load from a Canvas or Image element.
     * @param {HTMLImageElement|HTMLCanvasElement} source 
     */
    loadFromElement(source) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const ctx = tempCanvas.getContext('2d');

        // Draw image stretched to fit (user should crop beforehand or use helper)
        ctx.drawImage(source, 0, 0, this.width, this.height);

        const imgData = ctx.getImageData(0, 0, this.width, this.height);
        this.loadImage(imgData.data, true);
    }

    /**
     * Runs the algorithm to find the next steps.
     * @param {number} steps - How many lines to find in this call.
     * @returns {Array} - Array of added objects { pinIndex, p1, p2 }
     */
    generateSteps(steps = 1) {
        if (!this.pixels || this.pins.length === 0) return [];

        const results = [];

        for (let s = 0; s < steps; s++) {
            let bestPin = -1;
            let maxDarkness = -1;
            const current = this.currentPin;
            const numPins = this.pins.length;

            // Search for best connection
            for (let i = 0; i < numPins; i++) {
                if (i === current) continue;

                // Constraint: Don't connect to immediate neighbors (too short)
                const dist = Math.abs(current - i);
                const minGap = Math.max(5, Math.floor(numPins * 0.025));
                if (dist < minGap || dist > numPins - minGap) continue;

                const score = this.getLineScore(current, i);
                if (score > maxDarkness) {
                    maxDarkness = score;
                    bestPin = i;
                }
            }

            if (bestPin !== -1) {
                this.subtractLine(current, bestPin);
                this.sequence.push(bestPin);
                results.push({
                    from: current,
                    to: bestPin,
                    p1: this.pins[current],
                    p2: this.pins[bestPin]
                });
                this.currentPin = bestPin;
            } else {
                // If stuck, random jump
                const next = Math.floor(Math.random() * numPins);
                this.currentPin = next;
            }
        }
        return results;
    }

    /**
     * Calculates the average 'darkness' (needed string density) along a line.
     */
    getLineScore(p1Idx, p2Idx) {
        const p1 = this.pins[p1Idx];
        const p2 = this.pins[p2Idx];

        let x0 = Math.floor(p1.x), y0 = Math.floor(p1.y);
        let x1 = Math.floor(p2.x), y1 = Math.floor(p2.y);

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        let totalBrightness = 0;
        let pixelCount = 0;

        // Bresenham's Line Algorithm
        while (true) {
            const idx = y0 * this.width + x0;
            if (idx >= 0 && idx < this.pixels.length) {
                totalBrightness += this.pixels[idx];
                pixelCount++;
            }

            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }

        return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }

    /**
     * Subtracts the drawn line from the pixel data (whitewashes it).
     */
    subtractLine(p1Idx, p2Idx) {
        const p1 = this.pins[p1Idx];
        const p2 = this.pins[p2Idx];

        let x0 = Math.floor(p1.x), y0 = Math.floor(p1.y);
        let x1 = Math.floor(p2.x), y1 = Math.floor(p2.y);

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        const reduceAmount = 50; // Strength of string

        while (true) {
            const idx = y0 * this.width + x0;
            if (idx >= 0 && idx < this.pixels.length) {
                let val = this.pixels[idx];
                // Reduce darkness (make it whiter/done)
                this.pixels[idx] = Math.max(0, val - reduceAmount);
            }

            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }
};

// Export Management - supports both Modules and Global script tag
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StringArtGenerator };
} else if (typeof window !== 'undefined') {
    window.StringArtGenerator = StringArtGenerator;
} else if (typeof exports !== 'undefined') {
    exports.StringArtGenerator = StringArtGenerator;
}
