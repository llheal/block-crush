/**
 * Board — 10x10 grid logic
 */

const GRID_SIZE = 10;

export class Board {
    constructor() {
        // 0 = empty, 1-6 = colorId
        this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
    }

    get size() {
        return GRID_SIZE;
    }

    getCell(row, col) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return -1;
        return this.grid[row * GRID_SIZE + col];
    }

    setCell(row, col, value) {
        this.grid[row * GRID_SIZE + col] = value;
    }

    canPlace(piece, row, col) {
        const absCells = piece.getAbsoluteCells(row, col);
        for (const [r, c] of absCells) {
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (this.grid[r * GRID_SIZE + c] !== 0) return false;
        }
        return true;
    }

    place(piece, row, col) {
        const absCells = piece.getAbsoluteCells(row, col);
        for (const [r, c] of absCells) {
            this.grid[r * GRID_SIZE + c] = piece.colorId;
        }
        return absCells;
    }

    /**
     * Check and clear completed rows and columns.
     * Returns { clearedRows: number[], clearedCols: number[], clearedCells: [row,col][] }
     */
    checkAndClearLines() {
        const clearedRows = [];
        const clearedCols = [];
        const clearedCells = [];

        // Check rows
        for (let r = 0; r < GRID_SIZE; r++) {
            let full = true;
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[r * GRID_SIZE + c] === 0) { full = false; break; }
            }
            if (full) clearedRows.push(r);
        }

        // Check columns
        for (let c = 0; c < GRID_SIZE; c++) {
            let full = true;
            for (let r = 0; r < GRID_SIZE; r++) {
                if (this.grid[r * GRID_SIZE + c] === 0) { full = false; break; }
            }
            if (full) clearedCols.push(c);
        }

        // Collect cells to clear
        for (const r of clearedRows) {
            for (let c = 0; c < GRID_SIZE; c++) {
                clearedCells.push([r, c]);
            }
        }
        for (const c of clearedCols) {
            for (let r = 0; r < GRID_SIZE; r++) {
                if (!clearedRows.includes(r)) { // avoid duplicates
                    clearedCells.push([r, c]);
                }
            }
        }

        // Clear the cells
        for (const [r, c] of clearedCells) {
            this.grid[r * GRID_SIZE + c] = 0;
        }

        return {
            clearedRows,
            clearedCols,
            clearedCells,
            lineCount: clearedRows.length + clearedCols.length,
        };
    }

    /**
     * Check if any of the given pieces can be placed anywhere.
     */
    canAnyPieceFit(pieces) {
        for (const piece of pieces) {
            if (piece.placed) continue;
            for (let r = 0; r <= GRID_SIZE - piece.h; r++) {
                for (let c = 0; c <= GRID_SIZE - piece.w; c++) {
                    if (this.canPlace(piece, r, c)) return true;
                }
            }
        }
        return false;
    }

    reset() {
        this.grid.fill(0);
    }
}
