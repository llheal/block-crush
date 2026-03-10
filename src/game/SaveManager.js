/**
 * SaveManager — Auto-save game state to localStorage.
 * Saves after each move, clears on game over.
 * On startup, can restore board, pieces, and score.
 */

import { Piece, PIECE_SHAPES } from './Piece.js';

const SAVE_KEY = 'blockcrush_save';

export class SaveManager {
    /**
     * Save current game state.
     * @param {Board} board
     * @param {PieceGenerator} pieceGen
     * @param {ScoreManager} scoreMgr
     */
    static save(board, pieceGen, scoreMgr) {
        try {
            const state = {
                version: 1,
                grid: Array.from(board.grid),
                score: scoreMgr.score,
                combo: scoreMgr.combo,
                pieces: pieceGen.currentSet.map(p => ({
                    shapeId: p.id,
                    colorId: p.colorId,
                    placed: p.placed,
                    rotation: p.rotation,
                    cells: p.cells,
                    w: p.w,
                    h: p.h,
                })),
                timestamp: Date.now(),
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch { /* ignore quota errors */ }
    }

    /**
     * Check if a saved game exists.
     * @returns {boolean}
     */
    static hasSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const state = JSON.parse(raw);
            return state && state.version === 1 && Array.isArray(state.grid);
        } catch {
            return false;
        }
    }

    /**
     * Load saved game state.
     * @param {Board} board
     * @param {PieceGenerator} pieceGen
     * @param {ScoreManager} scoreMgr
     * @returns {boolean} true if load succeeded
     */
    static load(board, pieceGen, scoreMgr) {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const state = JSON.parse(raw);
            if (!state || state.version !== 1) return false;

            // Restore board grid
            for (let i = 0; i < state.grid.length && i < board.grid.length; i++) {
                board.grid[i] = state.grid[i];
            }

            // Restore score
            scoreMgr.score = state.score || 0;
            scoreMgr.combo = state.combo || 0;

            // Restore pieces
            pieceGen.currentSet = state.pieces.map(pd => {
                // Find the original shape definition
                const shapeDef = PIECE_SHAPES.find(s => s.id === pd.shapeId) || PIECE_SHAPES[0];
                const piece = new Piece(shapeDef, pd.colorId);
                piece.placed = pd.placed;
                piece.rotation = pd.rotation || 0;
                // Restore rotated cells directly
                piece.cells = pd.cells.map(c => [...c]);
                piece.w = pd.w;
                piece.h = pd.h;
                return piece;
            });

            return true;
        } catch (e) {
            console.warn('[Save] Failed to load:', e.message);
            return false;
        }
    }

    /**
     * Clear saved game (on game over or new game).
     */
    static clear() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch { /* ignore */ }
    }

    /**
     * Show resume dialog overlay.
     * @param {Function} onResume — called if user chooses to resume
     * @param {Function} onNewGame — called if user chooses new game
     */
    static showResumeDialog(onResume, onNewGame) {
        const overlay = document.createElement('div');
        overlay.id = 'resume-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 5, 2, 0.8)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            touchAction: 'none',
        });

        const card = document.createElement('div');
        Object.assign(card.style, {
            background: 'linear-gradient(145deg, #3a2a15, #2a1e0e)',
            border: '1px solid rgba(184, 137, 74, 0.3)',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '300px',
            width: '85%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        });

        const title = document.createElement('div');
        title.style.cssText = 'font-size:20px;font-weight:900;color:#e8c47a;margin-bottom:12px;';
        title.textContent = '📋 セーブデータあり';
        card.appendChild(title);

        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:13px;color:#d4a85c;line-height:1.6;margin-bottom:24px;';
        desc.textContent = '前回のゲームを続けますか？';
        card.appendChild(desc);

        // Resume button
        const resumeBtn = document.createElement('button');
        resumeBtn.textContent = '▶ 続きから';
        Object.assign(resumeBtn.style, {
            display: 'block',
            width: '100%',
            padding: '14px 0',
            border: 'none',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8a6535, #b8894a)',
            color: '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '16px',
            fontWeight: '800',
            letterSpacing: '2px',
            cursor: 'pointer',
            marginBottom: '10px',
            boxShadow: '0 4px 15px rgba(138,101,53,0.4)',
        });

        // New game button
        const newBtn = document.createElement('button');
        newBtn.textContent = '🔄 最初から';
        Object.assign(newBtn.style, {
            display: 'block',
            width: '100%',
            padding: '14px 0',
            border: '1px solid rgba(184, 137, 74, 0.3)',
            borderRadius: '12px',
            background: 'transparent',
            color: '#d4a85c',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: 'pointer',
        });

        const dismiss = (callback) => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                callback();
            }, 300);
        };

        resumeBtn.addEventListener('click', () => dismiss(onResume));
        resumeBtn.addEventListener('touchend', (e) => { e.preventDefault(); dismiss(onResume); });
        newBtn.addEventListener('click', () => dismiss(onNewGame));
        newBtn.addEventListener('touchend', (e) => { e.preventDefault(); dismiss(onNewGame); });

        card.appendChild(resumeBtn);
        card.appendChild(newBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    }
}
