/**
 * UIOverlay — controls the HTML UI elements (score, combo, game over)
 */
export class UIOverlay {
    constructor() {
        this.scoreEl = document.getElementById('score-value');
        this.bestEl = document.getElementById('best-value');
        this.comboEl = document.getElementById('combo-popup');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.finalScoreEl = document.getElementById('final-score-value');
        this.restartBtn = document.getElementById('restart-btn');
        this.shareBtn = document.getElementById('share-btn');

        this._animScore = 0;
        this._animTarget = 0;
        this._animFrame = null;
    }

    updateScore(score) {
        this._animTarget = score;
        if (!this._animFrame) {
            this._animateScore();
        }
    }

    _animateScore() {
        const diff = this._animTarget - this._animScore;
        if (Math.abs(diff) < 1) {
            this._animScore = this._animTarget;
            this.scoreEl.textContent = this._animScore;
            this._animFrame = null;
            return;
        }
        this._animScore += Math.ceil(diff * 0.2);
        this.scoreEl.textContent = this._animScore;

        // Bump effect
        this.scoreEl.classList.add('bump');
        setTimeout(() => this.scoreEl.classList.remove('bump'), 150);

        this._animFrame = requestAnimationFrame(() => this._animateScore());
    }

    updateBest(best) {
        this.bestEl.textContent = best;
    }

    showCombo(combo, lineCount) {
        if (combo < 2 && lineCount < 2) return;

        let text = '';
        if (lineCount >= 2) {
            const words = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!'];
            text = words[Math.min(lineCount, 5)] || `${lineCount}x LINES!`;
        }
        if (combo >= 2) {
            text += (text ? ' ' : '') + `COMBO ×${combo}`;
        }

        this.comboEl.textContent = text;
        this.comboEl.classList.remove('hidden', 'show');
        // Force reflow
        void this.comboEl.offsetWidth;
        this.comboEl.classList.add('show');

        setTimeout(() => {
            this.comboEl.classList.remove('show');
            this.comboEl.classList.add('hidden');
        }, 850);
    }

    showGameOver(finalScore, onRestart, onShare) {
        this.finalScoreEl.textContent = finalScore;
        this.gameOverOverlay.classList.remove('hidden');
        // Trigger animation
        requestAnimationFrame(() => {
            this.gameOverOverlay.classList.add('show');
        });

        this.restartBtn.onclick = () => {
            this.hideGameOver();
            onRestart();
        };

        if (onShare) {
            this.shareBtn.classList.remove('hidden');
            this.shareBtn.onclick = () => onShare(finalScore);
        }
    }

    hideGameOver() {
        this.gameOverOverlay.classList.remove('show');
        setTimeout(() => {
            this.gameOverOverlay.classList.add('hidden');
        }, 400);
    }

    reset() {
        this._animScore = 0;
        this._animTarget = 0;
        this.scoreEl.textContent = '0';
        this.hideGameOver();
    }
}
