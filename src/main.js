/**
 * Block Crush! — Main Entry Point (和風テーマ)
 * Ties together all modules with rotation, tutorial, and wafuu audio.
 */

import { Board } from './game/Board.js';
import { PieceGenerator } from './game/PieceGenerator.js';
import { ScoreManager } from './game/ScoreManager.js';
import { ThemeManager } from './theme/ThemeManager.js';
import { GameRenderer } from './renderer/GameRenderer.js';
import { EffectsRenderer } from './renderer/EffectsRenderer.js';
import { DragController } from './input/DragController.js';
import { UIOverlay } from './ui/UIOverlay.js';
import { SoundManager } from './audio/SoundManager.js';
import { Tutorial } from './ui/Tutorial.js';
import { SaveManager } from './game/SaveManager.js';
import { initLiff, isInLineApp, shareScore } from './liff.js';

// ===== Configuration =====
const LIFF_ID = '2009367746-DzXgq6pY';

// ===== Game State =====
let board;
let pieceGen;
let scoreMgr;
let theme;
let renderer;
let effects;
let dragCtrl;
let ui;
let sound;
let tutorial;

async function main() {
    await initLiff(LIFF_ID);

    theme = new ThemeManager();
    sound = new SoundManager();
    tutorial = new Tutorial();

    renderer = new GameRenderer(theme);
    const container = document.getElementById('game-container');
    await renderer.init(container);

    effects = new EffectsRenderer(renderer, theme);
    ui = new UIOverlay();

    // Init audio on first user interaction
    const initAudioOnce = () => {
        sound.init();
        sound.startBGM();
        document.removeEventListener('pointerdown', initAudioOnce);
        document.removeEventListener('touchstart', initAudioOnce);
    };
    document.addEventListener('pointerdown', initAudioOnce, { once: true });
    document.addEventListener('touchstart', initAudioOnce, { once: true });

    // Show tutorial on first run, then check for saved game
    tutorial.show(() => {
        if (SaveManager.hasSave()) {
            SaveManager.showResumeDialog(
                () => resumeGame(),   // Continue saved game
                () => startNewGame()  // Start fresh
            );
        } else {
            startNewGame();
        }
    });
}

function startNewGame() {
    SaveManager.clear();
    board = new Board();
    pieceGen = new PieceGenerator();
    scoreMgr = new ScoreManager();

    ui.reset();
    ui.updateBest(scoreMgr.best);
    renderer.syncBoard(board);

    const pieces = pieceGen.generateSet();
    renderTray(pieces);

    if (dragCtrl) dragCtrl.destroy();
    dragCtrl = new DragController(renderer, board, handlePlace, handleRotate);

    if (sound._initialized && !sound._bgmPlaying) {
        sound.startBGM();
    }

    // Auto-save initial state
    SaveManager.save(board, pieceGen, scoreMgr);
}

function resumeGame() {
    board = new Board();
    pieceGen = new PieceGenerator();
    scoreMgr = new ScoreManager();

    const loaded = SaveManager.load(board, pieceGen, scoreMgr);
    if (!loaded) {
        startNewGame();
        return;
    }

    ui.reset();
    ui.updateScore(scoreMgr.score);
    ui.updateBest(scoreMgr.best);
    renderer.syncBoard(board);
    renderTray(pieceGen.currentSet);

    if (dragCtrl) dragCtrl.destroy();
    dragCtrl = new DragController(renderer, board, handlePlace, handleRotate);

    if (sound._initialized && !sound._bgmPlaying) {
        sound.startBGM();
    }
}

function renderTray(pieces) {
    renderer.renderTray(pieces, (idx, e) => {
        const piece = pieceGen.currentSet[idx];
        if (piece && !piece.placed) {
            sound.playPickup();
            dragCtrl.startDrag(idx, piece, e);
        }
    });
}

/**
 * Handle piece rotation (tap on tray piece).
 */
function handleRotate(pieceIndex) {
    const piece = pieceGen.currentSet[pieceIndex];
    if (!piece || piece.placed) return;

    piece.rotateCW();
    sound.playRotate();

    // Re-render tray to show rotated piece
    renderTray(pieceGen.currentSet);
}

function handlePlace(pieceIndex, piece, row, col) {
    // 1. Store color info before clearing for effects
    const cellColorsBefore = [];
    const absCells = piece.getAbsoluteCells(row, col);
    for (const [r, c] of absCells) {
        cellColorsBefore.push(board.getCell(r, c));
    }

    // 2. Place piece
    const placedCells = board.place(piece, row, col);
    piece.placed = true;

    // 3. Score
    scoreMgr.addPlacement(placedCells.length);

    // 4. SFX
    sound.playPlace();

    // 5. Smooth board update (silky feel)
    renderer.syncBoard(board);

    // 6. Place effect (warm glow)
    effects.playPlaceEffect(placedCells, piece.colorId);

    // 7. Check line clears
    setTimeout(() => {
        const result = board.checkAndClearLines();
        if (result.lineCount > 0) {
            const bonus = scoreMgr.addLineClear(result.lineCount);

            // Wood breaking SFX
            sound.playClear(result.lineCount);

            // Combo SFX
            if (scoreMgr.combo > 1) {
                setTimeout(() => sound.playCombo(scoreMgr.combo), 200);
            }

            // Wood breaking effects
            effects.playClearEffect(
                result.clearedCells,
                result.clearedRows,
                result.clearedCols,
                board
            );

            // Score flyup
            if (result.clearedCells.length > 0) {
                const midCell = result.clearedCells[Math.floor(result.clearedCells.length / 2)];
                effects.showScoreFlyup(bonus, midCell[0], midCell[1]);
            }

            ui.showCombo(scoreMgr.combo, result.lineCount);

            // Delayed board sync for break animation
            setTimeout(() => {
                renderer.syncBoard(board);
            }, 300);
        } else {
            scoreMgr.addLineClear(0);
            renderer.syncBoard(board);
        }

        ui.updateScore(scoreMgr.score);
        ui.updateBest(scoreMgr.best);

        const checkAfterDelay = () => {
            if (pieceGen.allPlaced()) {
                const newPieces = pieceGen.generateSet();
                renderTray(newPieces);
                if (!board.canAnyPieceFit(newPieces)) {
                    gameOver();
                }
            } else {
                renderTray(pieceGen.currentSet);
                if (!board.canAnyPieceFit(pieceGen.getRemainingPieces())) {
                    gameOver();
                }
            }
        };

        if (result.lineCount > 0) {
            setTimeout(checkAfterDelay, 350);
        } else {
            checkAfterDelay();
        }
        // Auto-save after each move
        SaveManager.save(board, pieceGen, scoreMgr);
    }, 100);
}

function gameOver() {
    sound.playGameOver();
    sound.stopBGM();
    SaveManager.clear(); // Clear save on game over
    const shareHandler = isInLineApp() ? (score) => shareScore(score) : null;
    ui.showGameOver(scoreMgr.score, startNewGame, shareHandler);
}

// ===== Boot =====
main().catch((err) => {
    console.error('Block Crush! startup error:', err);
});
