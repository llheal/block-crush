const STORAGE_KEY = 'blockcrush_best';

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.best = this._loadBest();
        this.combo = 0;
    }

    addPlacement(cellCount) {
        this.score += cellCount;
        this._updateBest();
    }

    addLineClear(lineCount) {
        if (lineCount === 0) {
            this.combo = 0;
            return 0;
        }
        this.combo++;
        // Base: lineCount^2 * 10
        const lineBonus = lineCount * lineCount * 10;
        // Combo bonus: combo level * 5
        const comboBonus = this.combo > 1 ? this.combo * 5 : 0;
        const total = lineBonus + comboBonus;
        this.score += total;
        this._updateBest();
        return total;
    }

    reset() {
        this.score = 0;
        this.combo = 0;
    }

    _updateBest() {
        if (this.score > this.best) {
            this.best = this.score;
            this._saveBest();
        }
    }

    _loadBest() {
        try {
            return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        } catch {
            return 0;
        }
    }

    _saveBest() {
        try {
            localStorage.setItem(STORAGE_KEY, String(this.best));
        } catch { /* ignore */ }
    }
}
