import { Container, Graphics, Text } from 'pixi.js';

/**
 * EffectsRenderer — Wood-themed effects.
 * Line clears show wood splintering/breaking.
 * Placement has smooth, silky snap feel.
 */
export class EffectsRenderer {
    constructor(gameRenderer, themeManager) {
        this.gr = gameRenderer;
        this.theme = themeManager;
        this._shaking = false;
    }

    // ==================== WOOD BREAKING LINE CLEAR ====================

    /**
     * Wood-breaking line clear effect:
     * 1) Crack line appears across the row/column
     * 2) Wood cells split and fragment outward
     * 3) Wood splinters and sawdust particles
     * 4) Satisfying screen shake
     */
    playClearEffect(clearedCells, clearedRows, clearedCols, board) {
        const cs = this.gr.cellSize;
        const t = this.theme.current;

        // 1. Crack lines across rows/cols
        if (clearedRows) {
            for (const row of clearedRows) {
                this._playCrackLine(row, true);
            }
        }
        if (clearedCols) {
            for (const col of clearedCols) {
                this._playCrackLine(col, false);
            }
        }

        // 2. Staggered wood cell break
        clearedCells.forEach(([r, c], index) => {
            const delay = index * 20;
            setTimeout(() => {
                this._playWoodBreak(r, c);
            }, delay);
        });

        // 3. Screen shake
        const lineCount = (clearedRows?.length || 0) + (clearedCols?.length || 0);
        this._doShake(3 + lineCount * 2.5, 150 + lineCount * 50);
    }

    /**
     * Crack line that splits across a row or column before breaking.
     */
    _playCrackLine(index, isRow) {
        const cs = this.gr.cellSize;
        const container = this.gr.effectsContainer;
        const t = this.theme.current;

        const crack = new Graphics();
        container.addChild(crack);

        const length = cs * 10;
        let frame = 0;
        const totalFrames = 12;

        const anim = setInterval(() => {
            crack.clear();
            const progress = frame / totalFrames;
            const drawLength = length * Math.min(1, progress * 2); // crack extends fast

            if (isRow) {
                const y = index * cs + cs / 2;
                // Jagged crack line
                crack.moveTo(0, y);
                const segments = 20;
                for (let i = 1; i <= segments; i++) {
                    const sx = (drawLength * i) / segments;
                    if (sx > drawLength) break;
                    const jag = (Math.random() - 0.5) * 4;
                    crack.lineTo(sx, y + jag);
                }
                crack.stroke({ color: 0x3a2510, width: 2, alpha: 0.8 * (1 - progress * 0.5) });

                // Light leak through crack
                crack.moveTo(0, y);
                for (let i = 1; i <= 15; i++) {
                    const sx = (drawLength * i) / 15;
                    if (sx > drawLength) break;
                    crack.lineTo(sx, y + (Math.random() - 0.5) * 2);
                }
                crack.stroke({ color: t.woodHighlight, width: 1, alpha: 0.5 * (1 - progress) });
            } else {
                const x = index * cs + cs / 2;
                crack.moveTo(x, 0);
                const segments = 20;
                for (let i = 1; i <= segments; i++) {
                    const sy = (drawLength * i) / segments;
                    if (sy > drawLength) break;
                    const jag = (Math.random() - 0.5) * 4;
                    crack.lineTo(x + jag, sy);
                }
                crack.stroke({ color: 0x3a2510, width: 2, alpha: 0.8 * (1 - progress * 0.5) });

                crack.moveTo(x, 0);
                for (let i = 1; i <= 15; i++) {
                    const sy = (drawLength * i) / 15;
                    if (sy > drawLength) break;
                    crack.lineTo(x + (Math.random() - 0.5) * 2, sy);
                }
                crack.stroke({ color: t.woodHighlight, width: 1, alpha: 0.5 * (1 - progress) });
            }

            frame++;
            if (frame >= totalFrames) {
                clearInterval(anim);
                container.removeChild(crack);
                crack.destroy();
            }
        }, 16);
    }

    /**
     * Single wood cell breaking apart — splits into fragments.
     */
    _playWoodBreak(row, col) {
        const cs = this.gr.cellSize;
        const container = this.gr.effectsContainer;
        const cx = col * cs + cs / 2;
        const cy = row * cs + cs / 2;
        const t = this.theme.current;

        // Create wood fragments (4-6 rectangular splinters)
        const fragmentCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < fragmentCount; i++) {
            const frag = new Graphics();
            // Random splinter shape
            const fw = 3 + Math.random() * (cs * 0.4);
            const fh = 2 + Math.random() * (cs * 0.25);
            const fragColor = t.splinterColors[Math.floor(Math.random() * t.splinterColors.length)];

            // Draw wood splinter
            frag.roundRect(-fw / 2, -fh / 2, fw, fh, 1);
            frag.fill(fragColor);
            // grain line on splinter
            frag.moveTo(-fw * 0.3, 0);
            frag.lineTo(fw * 0.3, 0);
            frag.stroke({ color: t.woodGrain, width: 0.5, alpha: 0.3 });

            frag.x = cx;
            frag.y = cy;
            frag.rotation = Math.random() * Math.PI;
            container.addChild(frag);

            // Physics: explode outward
            const angle = (Math.PI * 2 * i) / fragmentCount + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 2;
            const rotSpeed = (Math.random() - 0.5) * 0.3;

            let life = 1.0;
            const decay = 0.025 + Math.random() * 0.015;

            const update = setInterval(() => {
                frag.x += vx * life;
                frag.y += vy * life + 0.8; // gravity
                frag.rotation += rotSpeed;
                life -= decay;
                frag.alpha = Math.max(0, life);
                frag.scale.set(0.3 + life * 0.7);

                if (life <= 0) {
                    clearInterval(update);
                    container.removeChild(frag);
                    frag.destroy();
                }
            }, 16);
        }

        // Sawdust particles (tiny circles)
        this._spawnSawdust(cx, cy, 4 + Math.floor(Math.random() * 4));
    }

    /**
     * Tiny sawdust particles — float away slowly.
     */
    _spawnSawdust(x, y, count) {
        const container = this.gr.effectsContainer;
        const t = this.theme.current;

        for (let i = 0; i < count; i++) {
            const p = new Graphics();
            const size = 1 + Math.random() * 2;
            p.circle(0, 0, size);
            p.fill({ color: t.woodHighlight, alpha: 0.7 });
            p.x = x + (Math.random() - 0.5) * 10;
            p.y = y + (Math.random() - 0.5) * 10;
            container.addChild(p);

            const vx = (Math.random() - 0.5) * 2;
            const vy = -1 - Math.random() * 2; // float up
            let life = 1.0;

            const update = setInterval(() => {
                p.x += vx;
                p.y += vy * life;
                life -= 0.02;
                p.alpha = life * 0.7;

                if (life <= 0) {
                    clearInterval(update);
                    container.removeChild(p);
                    p.destroy();
                }
            }, 16);
        }
    }

    // ==================== SCORE FLYUP ====================

    showScoreFlyup(points, gridRow, gridCol) {
        const cs = this.gr.cellSize;
        const x = gridCol * cs + cs / 2;
        const y = gridRow * cs;

        const text = new Text({
            text: `+${points}`,
            style: {
                fontFamily: 'Outfit',
                fontSize: 28,
                fontWeight: '900',
                fill: '#e8c47a', // Wood gold
                dropShadow: {
                    color: '#2a1a08',
                    blur: 6,
                    distance: 2,
                },
            },
        });
        text.anchor.set(0.5, 1);
        text.x = x;
        text.y = y;
        this.gr.effectsContainer.addChild(text);

        text.scale.set(0.3);
        let frame = 0;
        const totalFrames = 40;

        const anim = setInterval(() => {
            const progress = frame / totalFrames;

            if (progress < 0.15) {
                text.scale.set(0.3 + (progress / 0.15) * 1.0);
            } else if (progress < 0.25) {
                text.scale.set(1.3 - ((progress - 0.15) / 0.1) * 0.3);
            }

            text.y -= 1.5 * (1 - progress);

            if (progress > 0.7) {
                text.alpha = 1 - (progress - 0.7) / 0.3;
            }

            frame++;
            if (frame >= totalFrames) {
                clearInterval(anim);
                this.gr.effectsContainer.removeChild(text);
                text.destroy();
            }
        }, 16);
    }

    // ==================== SCREEN SHAKE ====================

    _doShake(intensity, durationMs) {
        if (this._shaking) return;
        this._shaking = true;
        const stage = this.gr.app.stage;
        const origX = 0;
        const origY = 0;
        const startTime = Date.now();

        const shake = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= durationMs) {
                clearInterval(shake);
                stage.x = origX;
                stage.y = origY;
                this._shaking = false;
                return;
            }
            const progress = elapsed / durationMs;
            const currentIntensity = intensity * (1 - progress);
            const shakeX = Math.sin(elapsed * 0.05) * currentIntensity;
            const shakeY = Math.cos(elapsed * 0.07) * currentIntensity;
            stage.x = origX + shakeX;
            stage.y = origY + shakeY;
        }, 16);
    }

    // ==================== PLACEMENT EFFECT (silky smooth) ====================

    playPlaceEffect(placedCells, colorId) {
        const cs = this.gr.cellSize;
        const container = this.gr.effectsContainer;
        const t = this.theme.current;

        for (const [r, c] of placedCells) {
            // Warm golden glow that fades in smoothly
            const glow = new Graphics();
            glow.roundRect(-1, -1, cs + 2, cs + 2, 5);
            glow.fill({ color: t.woodHighlight, alpha: 0.0 });
            glow.x = c * cs;
            glow.y = r * cs;
            container.addChild(glow);

            let frame = 0;
            const totalFrames = 16;
            const anim = setInterval(() => {
                const progress = frame / totalFrames;
                glow.clear();

                // Smooth fade in then out
                const alpha = Math.sin(progress * Math.PI) * 0.35;
                glow.roundRect(-1, -1, cs + 2, cs + 2, 4);
                glow.fill({ color: t.woodHighlight, alpha });

                frame++;
                if (frame >= totalFrames) {
                    clearInterval(anim);
                    container.removeChild(glow);
                    glow.destroy();
                }
            }, 16);
        }
    }
}
