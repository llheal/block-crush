/**
 * Piece definitions for Block Crush!
 * Each shape is an array of [row, col] offsets from the top-left corner.
 * Now supports rotation (90° clockwise).
 */

export const PIECE_SHAPES = [
    // Single
    { id: 'dot', cells: [[0, 0]], w: 1, h: 1 },

    // Lines
    { id: 'h2', cells: [[0, 0], [0, 1]], w: 2, h: 1 },
    { id: 'v2', cells: [[0, 0], [1, 0]], w: 1, h: 2 },
    { id: 'h3', cells: [[0, 0], [0, 1], [0, 2]], w: 3, h: 1 },
    { id: 'v3', cells: [[0, 0], [1, 0], [2, 0]], w: 1, h: 3 },
    { id: 'h4', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 4, h: 1 },
    { id: 'v4', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], w: 1, h: 4 },
    { id: 'h5', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], w: 5, h: 1 },
    { id: 'v5', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], w: 1, h: 5 },

    // Squares
    { id: 'sq2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 2, h: 2 },
    { id: 'sq3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], w: 3, h: 3 },

    // L shapes (2x2 corner)
    { id: 'l1', cells: [[0, 0], [1, 0], [1, 1]], w: 2, h: 2 },
    { id: 'l2', cells: [[0, 1], [1, 0], [1, 1]], w: 2, h: 2 },
    { id: 'l3', cells: [[0, 0], [0, 1], [1, 0]], w: 2, h: 2 },
    { id: 'l4', cells: [[0, 0], [0, 1], [1, 1]], w: 2, h: 2 },

    // L shapes (3x3 corner)
    { id: 'bl1', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], w: 3, h: 3 },
    { id: 'bl2', cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], w: 3, h: 3 },
    { id: 'bl3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], w: 3, h: 3 },
    { id: 'bl4', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], w: 3, h: 3 },

    // T shape
    { id: 't1', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], w: 3, h: 2 },
    { id: 't2', cells: [[0, 1], [1, 0], [1, 1], [1, 2]], w: 3, h: 2 },
    { id: 't3', cells: [[0, 0], [1, 0], [1, 1], [2, 0]], w: 2, h: 3 },
    { id: 't4', cells: [[0, 1], [1, 0], [1, 1], [2, 1]], w: 2, h: 3 },

    // S/Z shapes
    { id: 's1', cells: [[0, 1], [0, 2], [1, 0], [1, 1]], w: 3, h: 2 },
    { id: 'z1', cells: [[0, 0], [0, 1], [1, 1], [1, 2]], w: 3, h: 2 },
    { id: 's2', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], w: 2, h: 3 },
    { id: 'z2', cells: [[0, 1], [1, 0], [1, 1], [2, 0]], w: 2, h: 3 },
];

// Weight for random generation: smaller pieces more common
const WEIGHTS = {
    dot: 3, h2: 5, v2: 5, h3: 5, v3: 5, h4: 3, v4: 3, h5: 1, v5: 1,
    sq2: 4, sq3: 1,
    l1: 4, l2: 4, l3: 4, l4: 4,
    bl1: 2, bl2: 2, bl3: 2, bl4: 2,
    t1: 3, t2: 3, t3: 3, t4: 3,
    s1: 3, z1: 3, s2: 3, z2: 3,
};

export class Piece {
    constructor(shapeData, colorId) {
        this.id = shapeData.id;
        this.cells = shapeData.cells.map(c => [...c]); // deep copy
        this.w = shapeData.w;
        this.h = shapeData.h;
        this.colorId = colorId;
        this.placed = false;
        this.rotation = 0; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
    }

    getAbsoluteCells(row, col) {
        return this.cells.map(([r, c]) => [row + r, col + c]);
    }

    /**
     * Rotate 90° clockwise.
     * Transform: (r, c) → (c, maxR - r)
     * Then normalize so min row/col = 0.
     */
    rotateCW() {
        const maxR = this.h - 1;
        // Transform each cell
        const newCells = this.cells.map(([r, c]) => [c, maxR - r]);

        // Normalize to (0,0) origin
        let minR = Infinity, minC = Infinity;
        for (const [r, c] of newCells) {
            if (r < minR) minR = r;
            if (c < minC) minC = c;
        }
        for (let i = 0; i < newCells.length; i++) {
            newCells[i][0] -= minR;
            newCells[i][1] -= minC;
        }

        // Update dimensions (swap w and h)
        this.cells = newCells;
        const oldW = this.w;
        this.w = this.h;
        this.h = oldW;
        this.rotation = (this.rotation + 1) % 4;
    }

    static getWeightedRandom() {
        const entries = PIECE_SHAPES.map(s => ({ shape: s, weight: WEIGHTS[s.id] || 1 }));
        const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
        let r = Math.random() * totalWeight;
        for (const entry of entries) {
            r -= entry.weight;
            if (r <= 0) return entry.shape;
        }
        return entries[entries.length - 1].shape;
    }
}
