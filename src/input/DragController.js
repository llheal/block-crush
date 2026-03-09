/**
 * DragController — tap-to-rotate + drag-to-place with wood texture.
 */
import { Container, Graphics, Sprite, Texture, Rectangle } from 'pixi.js';

export class DragController {
    constructor(gameRenderer, board, onPlace, onRotate) {
        this.gr = gameRenderer;
        this.board = board;
        this.onPlace = onPlace;
        this.onRotate = onRotate;

        this._dragging = false;
        this._dragPiece = null;
        this._dragIndex = -1;
        this._dragGraphics = null;
        this._lastGridPos = null;

        this._pointerDownTime = 0;
        this._pointerDownPos = { x: 0, y: 0 };
        this._tapThresholdMs = 200;
        this._tapThresholdPx = 10;
        this._hasMoved = false;
        this._fingerOffsetY = -60;

        this._onMove = this._onMove.bind(this);
        this._onUp = this._onUp.bind(this);

        const canvas = this.gr.app.canvas;
        canvas.addEventListener('pointermove', this._onMove, { passive: false });
        canvas.addEventListener('pointerup', this._onUp);
        canvas.addEventListener('pointercancel', this._onUp);
    }

    startDrag(pieceIndex, piece, pointerEvent) {
        this._pointerDownTime = Date.now();
        this._pointerDownPos = { x: pointerEvent.clientX, y: pointerEvent.clientY };

        if (this._dragging) return;
        this._dragging = true;
        this._dragPiece = piece;
        this._dragIndex = pieceIndex;
        this._hasMoved = false;

        const cs = this.gr.cellSize;
        const container = new Container();

        // Draw piece with real wood texture
        for (const [r, c] of piece.cells) {
            const cellContainer = new Container();

            const hasTop = piece.cells.some(([pr, pc]) => pr === r - 1 && pc === c);
            const hasBottom = piece.cells.some(([pr, pc]) => pr === r + 1 && pc === c);
            const hasLeft = piece.cells.some(([pr, pc]) => pr === r && pc === c - 1);
            const hasRight = piece.cells.some(([pr, pc]) => pr === r && pc === c + 1);

            const inTop = hasTop ? 0 : 1;
            const inBottom = hasBottom ? 0 : 1;
            const inLeft = hasLeft ? 0 : 1;
            const inRight = hasRight ? 0 : 1;

            const x = inLeft;
            const y = inTop;
            const w = cs - inLeft - inRight;
            const h = cs - inTop - inBottom;

            if (this.gr.woodTexture) {
                const tex = this.gr.woodTexture;
                const texW = tex.width;
                const texH = tex.height;

                // Map piece bounding box to continuous texture — no wrapping
                const pieceW = piece.w * cs;
                const pieceH = piece.h * cs;
                const pScaleX = texW / Math.max(pieceW, 1);
                const pScaleY = texH / Math.max(pieceH, 1);

                const cellPixelX = c * cs;
                const cellPixelY = r * cs;
                const srcX = Math.max(0, (cellPixelX + x) * pScaleX);
                const srcY = Math.max(0, (cellPixelY + y) * pScaleY);
                const srcW = Math.max(1, Math.min(w * pScaleX, texW - srcX));
                const srcH = Math.max(1, Math.min(h * pScaleY, texH - srcY));

                const frame = new Rectangle(srcX, srcY, srcW, srcH);
                const subTex = new Texture({ source: tex.source, frame });
                const sprite = new Sprite(subTex);
                sprite.x = x;
                sprite.y = y;
                sprite.width = w;
                sprite.height = h;
                cellContainer.addChild(sprite);

                // Edges
                const edges = new Graphics();
                if (!hasTop) { edges.rect(x, y, w, 2); edges.fill({ color: 0xffffff, alpha: 0.2 }); }
                if (!hasLeft) { edges.rect(x, y, 1.5, h); edges.fill({ color: 0xffffff, alpha: 0.12 }); }
                if (!hasBottom) { edges.rect(x, y + h - 2, w, 2); edges.fill({ color: 0x000000, alpha: 0.2 }); }
                if (!hasRight) { edges.rect(x + w - 1.5, y, 1.5, h); edges.fill({ color: 0x000000, alpha: 0.12 }); }
                cellContainer.addChild(edges);
            } else {
                const g = new Graphics();
                g.roundRect(x, y, w, h, 3);
                g.fill(this.gr.theme.current.woodBase);
                if (!hasTop) { g.rect(x, y, w, 2); g.fill({ color: 0xffffff, alpha: 0.15 }); }
                if (!hasBottom) { g.rect(x, y + h - 2, w, 2); g.fill({ color: 0x000000, alpha: 0.15 }); }
                cellContainer.addChild(g);
            }

            cellContainer.x = c * cs;
            cellContainer.y = r * cs;
            container.addChild(cellContainer);
        }

        // Drop shadow
        const shadow = new Graphics();
        for (const [r, c] of piece.cells) {
            shadow.roundRect(c * cs + 3, r * cs + 3, cs - 2, cs - 2, 3);
        }
        shadow.fill({ color: 0x000000, alpha: 0.3 });
        container.addChildAt(shadow, 0);

        container.alpha = 0.9;
        this.gr.app.stage.addChild(container);
        this._dragGraphics = container;

        const rect = this.gr.app.canvas.getBoundingClientRect();
        const scaleX = this.gr.app.screen.width / rect.width;
        const scaleY = this.gr.app.screen.height / rect.height;
        const px = (pointerEvent.clientX - rect.left) * scaleX;
        const py = (pointerEvent.clientY - rect.top) * scaleY;

        container.x = px - (piece.w * cs) / 2;
        container.y = py - (piece.h * cs) / 2 + this._fingerOffsetY;

        if (this.gr.trayPieceContainers[pieceIndex]) {
            this.gr.trayPieceContainers[pieceIndex].visible = false;
        }

        this._updateGhost(px, py);
    }

    _onMove(e) {
        if (!this._dragging) return;
        e.preventDefault();

        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        if (Math.abs(dx) > this._tapThresholdPx || Math.abs(dy) > this._tapThresholdPx) {
            this._hasMoved = true;
        }

        const rect = this.gr.app.canvas.getBoundingClientRect();
        const scaleX = this.gr.app.screen.width / rect.width;
        const scaleY = this.gr.app.screen.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;

        const cs = this.gr.cellSize;
        this._dragGraphics.x = px - (this._dragPiece.w * cs) / 2;
        this._dragGraphics.y = py - (this._dragPiece.h * cs) / 2 + this._fingerOffsetY;

        this._updateGhost(px, py);
    }

    _updateGhost(px, py) {
        const cs = this.gr.cellSize;
        const topLeftX = this._dragGraphics.x;
        const topLeftY = this._dragGraphics.y;
        const localX = topLeftX - this.gr.boardX;
        const localY = topLeftY - this.gr.boardY;
        const col = Math.round(localX / cs);
        const row = Math.round(localY / cs);

        const gridPos = `${row},${col}`;
        if (gridPos === this._lastGridPos) return;
        this._lastGridPos = gridPos;

        if (row < 0 || row + this._dragPiece.h > 10 || col < 0 || col + this._dragPiece.w > 10) {
            this.gr.clearGhost();
            return;
        }

        const valid = this.board.canPlace(this._dragPiece, row, col);
        this.gr.showGhost(this._dragPiece, row, col, valid);
    }

    _onUp(e) {
        if (!this._dragging) return;

        const elapsed = Date.now() - this._pointerDownTime;

        // TAP → rotate
        if (elapsed < this._tapThresholdMs && !this._hasMoved) {
            this.gr.clearGhost();
            if (this._dragGraphics) {
                this.gr.app.stage.removeChild(this._dragGraphics);
                this._dragGraphics.destroy({ children: true });
                this._dragGraphics = null;
            }
            if (this.gr.trayPieceContainers[this._dragIndex]) {
                this.gr.trayPieceContainers[this._dragIndex].visible = true;
            }
            if (this.onRotate) this.onRotate(this._dragIndex);

            this._dragging = false;
            this._dragPiece = null;
            this._dragIndex = -1;
            this._lastGridPos = null;
            return;
        }

        // DRAG → place
        const cs = this.gr.cellSize;
        const topLeftX = this._dragGraphics.x;
        const topLeftY = this._dragGraphics.y;
        const localX = topLeftX - this.gr.boardX;
        const localY = topLeftY - this.gr.boardY;
        const col = Math.round(localX / cs);
        const row = Math.round(localY / cs);

        let placed = false;
        if (row >= 0 && row + this._dragPiece.h <= 10 &&
            col >= 0 && col + this._dragPiece.w <= 10 &&
            this.board.canPlace(this._dragPiece, row, col)) {
            placed = true;
            this.onPlace(this._dragIndex, this._dragPiece, row, col);
        }

        this.gr.clearGhost();
        if (this._dragGraphics) {
            this.gr.app.stage.removeChild(this._dragGraphics);
            this._dragGraphics.destroy({ children: true });
            this._dragGraphics = null;
        }

        if (!placed && this.gr.trayPieceContainers[this._dragIndex]) {
            this.gr.trayPieceContainers[this._dragIndex].visible = true;
        }

        this._dragging = false;
        this._dragPiece = null;
        this._dragIndex = -1;
        this._lastGridPos = null;
    }

    destroy() {
        const canvas = this.gr.app?.canvas;
        if (canvas) {
            canvas.removeEventListener('pointermove', this._onMove);
            canvas.removeEventListener('pointerup', this._onUp);
            canvas.removeEventListener('pointercancel', this._onUp);
        }
    }
}
