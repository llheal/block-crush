import { Piece } from './Piece.js';

const NUM_COLORS = 6;

export class PieceGenerator {
    constructor() {
        this.currentSet = [];
    }

    generateSet() {
        this.currentSet = [];
        for (let i = 0; i < 3; i++) {
            const shape = Piece.getWeightedRandom();
            const colorId = Math.floor(Math.random() * NUM_COLORS) + 1;
            this.currentSet.push(new Piece(shape, colorId));
        }
        return this.currentSet;
    }

    allPlaced() {
        return this.currentSet.every(p => p.placed);
    }

    getRemainingPieces() {
        return this.currentSet.filter(p => !p.placed);
    }
}
