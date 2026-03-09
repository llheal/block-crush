import { Application, Container, Graphics, Sprite, Texture, Assets, Rectangle } from 'pixi.js';

/**
 * GameRenderer — realistic nature theme with image-based textures.
 * Uses actual wood texture for blocks and nature photo background.
 */
export class GameRenderer {
    constructor(themeManager) {
        this.theme = themeManager;
        this.app = null;
        this.cellSize = 0;
        this.boardX = 0;
        this.boardY = 0;
        this.trayY = 0;

        // Containers
        this.bgContainer = new Container();
        this.boardContainer = new Container();
        this.boardBgContainer = new Container();
        this.boardBlockContainer = new Container();
        this.ghostContainer = new Container();
        this.trayContainer = new Container();
        this.effectsContainer = new Container();

        // Grid
        this.cellSprites = [];
        this.ghostSprites = [];
        this.trayPieceContainers = [];

        // Textures
        this.woodTexture = null;
        this.bgTexture = null;
        this.bgSprite = null;

        this._boardRef = null;
        this._resizeHandler = null;
    }

    async init(containerEl) {
        this.app = new Application();
        await this.app.init({
            background: 0x1a3a0a,
            resizeTo: containerEl,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
        });
        containerEl.appendChild(this.app.canvas);

        // Load textures
        try {
            this.woodTexture = await Assets.load('./wood_texture.png');
        } catch (e) {
            console.warn('[Renderer] Wood texture failed to load');
        }
        try {
            this.bgTexture = await Assets.load('./bg_nature.png');
        } catch (e) {
            console.warn('[Renderer] Background texture failed to load');
        }

        // Background image
        this.app.stage.addChild(this.bgContainer);

        this.boardContainer.addChild(this.boardBgContainer);
        this.boardContainer.addChild(this.boardBlockContainer);
        this.app.stage.addChild(this.boardContainer);
        this.app.stage.addChild(this.ghostContainer);
        this.app.stage.addChild(this.trayContainer);
        this.app.stage.addChild(this.effectsContainer);

        this._calcLayout();
        this._createBackground();
        this._createBoard();
        this._setupResize(containerEl);
    }

    _calcLayout() {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        const headerH = 60;
        const trayH = h * 0.22;
        const availH = h - headerH - trayH - 20;
        const availW = w - 20;

        this.cellSize = Math.floor(Math.min(availW, availH) / 10);
        const boardPx = this.cellSize * 10;
        this.boardX = Math.floor((w - boardPx) / 2);
        this.boardY = headerH + Math.floor((availH - boardPx) / 2);
        this.trayY = this.boardY + boardPx + 15;

        this.boardContainer.x = this.boardX;
        this.boardContainer.y = this.boardY;
        this.ghostContainer.x = this.boardX;
        this.ghostContainer.y = this.boardY;
        this.effectsContainer.x = this.boardX;
        this.effectsContainer.y = this.boardY;
    }

    _createBackground() {
        this.bgContainer.removeChildren();

        if (this.bgTexture) {
            const bg = new Sprite(this.bgTexture);
            // Cover entire screen
            const scaleX = this.app.screen.width / bg.texture.width;
            const scaleY = this.app.screen.height / bg.texture.height;
            const scale = Math.max(scaleX, scaleY);
            bg.scale.set(scale);
            bg.x = (this.app.screen.width - bg.texture.width * scale) / 2;
            bg.y = (this.app.screen.height - bg.texture.height * scale) / 2;
            this.bgContainer.addChild(bg);

            // Slight darkening overlay for readability
            const overlay = new Graphics();
            overlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
            overlay.fill({ color: 0x000000, alpha: 0.25 });
            this.bgContainer.addChild(overlay);

            // Frosted backdrop behind tray area so pieces are clearly visible
            const trayBg = new Graphics();
            const trayTop = this.trayY - 8;
            const trayHeight = this.app.screen.height - trayTop;
            trayBg.roundRect(8, trayTop, this.app.screen.width - 16, trayHeight, 12);
            trayBg.fill({ color: 0x2a1e12, alpha: 0.75 });
            trayBg.roundRect(8, trayTop, this.app.screen.width - 16, trayHeight, 12);
            trayBg.stroke({ color: 0x8a6a3e, width: 1, alpha: 0.3 });
            this.bgContainer.addChild(trayBg);

            this.bgSprite = bg;
        }
    }

    _createBoard() {
        this.boardBgContainer.removeChildren();
        this.boardBlockContainer.removeChildren();
        this.cellSprites = [];

        const cs = this.cellSize;

        // Board backdrop — frosted glass effect
        const backdrop = new Graphics();
        backdrop.roundRect(-8, -8, cs * 10 + 16, cs * 10 + 16, 12);
        backdrop.fill({ color: 0x000000, alpha: 0.3 });
        this.boardBgContainer.addChild(backdrop);

        const boardBg = new Graphics();
        boardBg.roundRect(-4, -4, cs * 10 + 8, cs * 10 + 8, 8);
        boardBg.fill({ color: 0x2a1e12, alpha: 0.55 });
        boardBg.stroke({ color: 0x8a6a3e, width: 1.5, alpha: 0.25 });
        this.boardBgContainer.addChild(boardBg);

        // Grid cells
        for (let r = 0; r < 10; r++) {
            this.cellSprites[r] = [];
            for (let c = 0; c < 10; c++) {
                // Empty cell bg
                const bg = new Graphics();
                const isAlt = (r + c) % 2 === 0;
                bg.roundRect(1, 1, cs - 2, cs - 2, 2);
                bg.fill({ color: isAlt ? 0x3a2a18 : 0x322414, alpha: 0.5 });
                bg.x = c * cs;
                bg.y = r * cs;
                this.boardBgContainer.addChild(bg);

                // Block cell container
                const blockContainer = new Container();
                blockContainer.x = c * cs;
                blockContainer.y = r * cs;
                blockContainer.visible = false;
                this.boardBlockContainer.addChild(blockContainer);
                this.cellSprites[r][c] = blockContainer;
            }
        }
    }

    syncBoard(board) {
        this._boardRef = board;
        const cs = this.cellSize;

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                const container = this.cellSprites[r][c];
                // Clear previous children
                container.removeChildren();

                const colorId = board.getCell(r, c);
                if (colorId === 0) {
                    container.visible = false;
                    continue;
                }

                container.visible = true;

                // Check neighbors for seamless joining
                const hasTop = r > 0 && board.getCell(r - 1, c) !== 0;
                const hasBottom = r < 9 && board.getCell(r + 1, c) !== 0;
                const hasLeft = c > 0 && board.getCell(r, c - 1) !== 0;
                const hasRight = c < 9 && board.getCell(r, c + 1) !== 0;

                const inTop = hasTop ? 0 : 1;
                const inBottom = hasBottom ? 0 : 1;
                const inLeft = hasLeft ? 0 : 1;
                const inRight = hasRight ? 0 : 1;

                const x = inLeft;
                const y = inTop;
                const w = cs - inLeft - inRight;
                const h = cs - inTop - inBottom;

                // Use wood texture sprite if available
                if (this.woodTexture) {
                    this._drawTexturedWoodCell(container, x, y, w, h, r, c, cs, hasTop, hasBottom, hasLeft, hasRight);
                } else {
                    this._drawProceduralWoodCell(container, x, y, w, h, r, c, cs, hasTop, hasBottom, hasLeft, hasRight);
                }
            }
        }
    }

    _drawTexturedWoodCell(container, x, y, w, h, row, col, cs, hasTop, hasBottom, hasLeft, hasRight) {
        const tex = this.woodTexture;
        const texW = tex.width;
        const texH = tex.height;

        // Map ENTIRE 10x10 board to one texture read — NO wrapping = NO seams.
        // Each cell shows its portion of the same continuous texture.
        const boardW = cs * 10;
        const boardH = cs * 10;
        const scaleX = texW / boardW;
        const scaleY = texH / boardH;

        // Board-pixel position (absolute, unaffected by insets)
        const boardPixelX = col * cs;
        const boardPixelY = row * cs;

        // Source rect: insets shift within the cell but UV stays board-aligned
        const srcX = Math.max(0, (boardPixelX + x) * scaleX);
        const srcY = Math.max(0, (boardPixelY + y) * scaleY);
        const srcW = Math.max(1, Math.min(w * scaleX, texW - srcX));
        const srcH = Math.max(1, Math.min(h * scaleY, texH - srcY));

        const frame = new Rectangle(srcX, srcY, srcW, srcH);
        const subTex = new Texture({ source: tex.source, frame });
        const sprite = new Sprite(subTex);
        sprite.x = x;
        sprite.y = y;
        sprite.width = w;
        sprite.height = h;
        container.addChild(sprite);

        // Add masking shape for rounded corners
        const rTL = (!hasTop && !hasLeft) ? 5 : 0;
        const rTR = (!hasTop && !hasRight) ? 5 : 0;
        const rBL = (!hasBottom && !hasLeft) ? 5 : 0;
        const rBR = (!hasBottom && !hasRight) ? 5 : 0;

        // Edge highlight & shadow overlay
        const edges = new Graphics();

        // Top highlight (only on exposed edges)
        if (!hasTop) {
            edges.rect(x + rTL, y, w - rTL - rTR, 2);
            edges.fill({ color: 0xffffff, alpha: 0.2 });
        }
        if (!hasLeft) {
            edges.rect(x, y + rTL, 1.5, h - rTL - rBL);
            edges.fill({ color: 0xffffff, alpha: 0.12 });
        }
        // Bottom shadow
        if (!hasBottom) {
            edges.rect(x + rBL, y + h - 2, w - rBL - rBR, 2);
            edges.fill({ color: 0x000000, alpha: 0.2 });
        }
        if (!hasRight) {
            edges.rect(x + w - 1.5, y + rTR, 1.5, h - rTR - rBR);
            edges.fill({ color: 0x000000, alpha: 0.12 });
        }

        // Subtle inner glow for polished wood feel
        if (!hasTop || !hasLeft || !hasBottom || !hasRight) {
            edges.roundRect(x + 1, y + 1, w - 2, h - 2, Math.max(rTL, rTR, rBL, rBR) - 1);
            edges.stroke({ color: 0xffffff, width: 0.5, alpha: 0.08 });
        }

        container.addChild(edges);
    }

    _drawProceduralWoodCell(container, x, y, w, h, row, col, cs, hasTop, hasBottom, hasLeft, hasRight) {
        const t = this.theme.current;
        const g = new Graphics();

        const rTL = (!hasTop && !hasLeft) ? 5 : 0;
        const rTR = (!hasTop && !hasRight) ? 5 : 0;
        const rBL = (!hasBottom && !hasLeft) ? 5 : 0;
        const rBR = (!hasBottom && !hasRight) ? 5 : 0;

        this._drawRoundedRect(g, x, y, w, h, rTL, rTR, rBR, rBL);
        const variation = this._woodNoise(row * 0.7, col * 0.3) * 0.12;
        g.fill(this._adjustBrightness(t.woodBase, variation));

        for (let i = 0; i < 3; i++) {
            const grainY = y + (h * (i + 0.5)) / 3;
            const grainW = w * 0.7;
            const grainX = x + (w - grainW) * 0.2;
            g.moveTo(grainX, grainY);
            g.bezierCurveTo(grainX + grainW * 0.3, grainY - 1, grainX + grainW * 0.7, grainY + 1, grainX + grainW, grainY);
            g.stroke({ color: t.woodGrain, width: 0.8, alpha: 0.2 });
        }

        if (!hasTop) { g.rect(x, y, w, 2); g.fill({ color: 0xffffff, alpha: 0.15 }); }
        if (!hasBottom) { g.rect(x, y + h - 2, w, 2); g.fill({ color: 0x000000, alpha: 0.15 }); }

        container.addChild(g);
    }

    _drawRoundedRect(g, x, y, w, h, rTL, rTR, rBR, rBL) {
        g.moveTo(x + rTL, y);
        g.lineTo(x + w - rTR, y);
        if (rTR > 0) g.arcTo(x + w, y, x + w, y + rTR, rTR);
        else g.lineTo(x + w, y);
        g.lineTo(x + w, y + h - rBR);
        if (rBR > 0) g.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
        else g.lineTo(x + w, y + h);
        g.lineTo(x + rBL, y + h);
        if (rBL > 0) g.arcTo(x, y + h, x, y + h - rBL, rBL);
        else g.lineTo(x, y + h);
        g.lineTo(x, y + rTL);
        if (rTL > 0) g.arcTo(x, y, x + rTL, y, rTL);
        else g.lineTo(x, y);
        g.closePath();
    }

    _woodNoise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    _adjustBrightness(hex, factor) {
        let r = (hex >> 16) & 0xff;
        let g = (hex >> 8) & 0xff;
        let b = hex & 0xff;
        if (factor > 0) {
            r = Math.min(255, r + (255 - r) * factor);
            g = Math.min(255, g + (255 - g) * factor);
            b = Math.min(255, b + (255 - b) * factor);
        } else {
            r = Math.max(0, r * (1 + factor));
            g = Math.max(0, g * (1 + factor));
            b = Math.max(0, b * (1 + factor));
        }
        return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }

    showGhost(piece, row, col, valid) {
        this.clearGhost();
        const cs = this.cellSize;

        for (const [dr, dc] of piece.cells) {
            const gr = row + dr;
            const gc = col + dc;
            if (gr < 0 || gr >= 10 || gc < 0 || gc >= 10) continue;

            const g = new Graphics();
            if (valid) {
                g.roundRect(1, 1, cs - 2, cs - 2, 3);
                g.fill({ color: 0x88cc55, alpha: 0.35 });
            } else {
                g.roundRect(1, 1, cs - 2, cs - 2, 3);
                g.fill({ color: 0xcc4444, alpha: 0.25 });
            }
            g.x = gc * cs;
            g.y = gr * cs;
            this.ghostContainer.addChild(g);
            this.ghostSprites.push(g);
        }
    }

    clearGhost() {
        for (const g of this.ghostSprites) {
            this.ghostContainer.removeChild(g);
            g.destroy();
        }
        this.ghostSprites = [];
    }

    /** Render tray pieces with real wood texture */
    renderTray(pieces, onPieceDown) {
        this.trayContainer.removeChildren();
        this.trayPieceContainers = [];

        const w = this.app.screen.width;
        const slotW = w / 3;
        const trayCS = this.cellSize * 0.55;

        pieces.forEach((piece, idx) => {
            if (piece.placed) return;

            const container = new Container();
            container.eventMode = 'static';
            container.cursor = 'pointer';

            const pieceW = piece.w * trayCS;
            const pieceH = piece.h * trayCS;
            const offsetX = slotW * idx + (slotW - pieceW) / 2;
            const offsetY = this.trayY + 10;

            container.x = offsetX;
            container.y = offsetY;

            for (const [r, c] of piece.cells) {
                const cellContainer = new Container();
                cellContainer.x = c * trayCS;
                cellContainer.y = r * trayCS;

                const hasTop = piece.cells.some(([pr, pc]) => pr === r - 1 && pc === c);
                const hasBottom = piece.cells.some(([pr, pc]) => pr === r + 1 && pc === c);
                const hasLeft = piece.cells.some(([pr, pc]) => pr === r && pc === c - 1);
                const hasRight = piece.cells.some(([pr, pc]) => pr === r && pc === c + 1);

                const inTop = hasTop ? 0 : 1;
                const inBottom = hasBottom ? 0 : 1;
                const inLeft = hasLeft ? 0 : 1;
                const inRight = hasRight ? 0 : 1;

                if (this.woodTexture) {
                    const tex = this.woodTexture;
                    const texW = tex.width;
                    const texH = tex.height;

                    // Map piece bounding box to continuous texture region
                    // Use piece max dimensions to define the texture area
                    const pieceTexW = piece.w * trayCS;
                    const pieceTexH = piece.h * trayCS;
                    const pScaleX = texW / Math.max(pieceTexW, 1);
                    const pScaleY = texH / Math.max(pieceTexH, 1);

                    // Each cell maps to its portion within the piece space
                    const cellPixelX = c * trayCS;
                    const cellPixelY = r * trayCS;

                    const srcX = Math.max(0, (cellPixelX + inLeft) * pScaleX);
                    const srcY = Math.max(0, (cellPixelY + inTop) * pScaleY);
                    const cellW = trayCS - inLeft - inRight;
                    const cellH = trayCS - inTop - inBottom;
                    const srcW = Math.max(1, Math.min(cellW * pScaleX, texW - srcX));
                    const srcH = Math.max(1, Math.min(cellH * pScaleY, texH - srcY));

                    const frame = new Rectangle(srcX, srcY, srcW, srcH);
                    const subTex = new Texture({ source: tex.source, frame });
                    const sprite = new Sprite(subTex);
                    sprite.x = inLeft;
                    sprite.y = inTop;
                    sprite.width = cellW;
                    sprite.height = cellH;
                    cellContainer.addChild(sprite);

                    // Edge effects
                    const edges = new Graphics();
                    if (!hasTop) {
                        edges.rect(inLeft, inTop, cellW, 1.5);
                        edges.fill({ color: 0xffffff, alpha: 0.18 });
                    }
                    if (!hasBottom) {
                        edges.rect(inLeft, trayCS - inBottom - 1, cellW, 1.5);
                        edges.fill({ color: 0x000000, alpha: 0.18 });
                    }
                    cellContainer.addChild(edges);
                } else {
                    const g = new Graphics();
                    g.roundRect(inLeft, inTop, trayCS - inLeft - inRight, trayCS - inTop - inBottom, 2);
                    g.fill(this.theme.current.woodBase);
                    cellContainer.addChild(g);
                }

                container.addChild(cellContainer);
            }

            // Hit area
            const hitArea = new Graphics();
            hitArea.rect(-10, -10, pieceW + 20, pieceH + 20);
            hitArea.fill({ color: 0x000000, alpha: 0.001 });
            container.addChild(hitArea);

            container.on('pointerdown', (e) => onPieceDown(idx, e));

            this.trayContainer.addChild(container);
            this.trayPieceContainers[idx] = container;
        });
    }

    screenToGrid(screenX, screenY) {
        const localX = screenX - this.boardX;
        const localY = screenY - this.boardY;
        const col = Math.floor(localX / this.cellSize);
        const row = Math.floor(localY / this.cellSize);
        if (row < 0 || row >= 10 || col < 0 || col >= 10) return null;
        return [row, col];
    }

    _setupResize(containerEl) {
        this._resizeHandler = () => {
            this._calcLayout();
            this._createBackground();
            this._createBoard();
            if (this._boardRef) this.syncBoard(this._boardRef);
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    destroy() {
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        this.app?.destroy(true);
    }
}
