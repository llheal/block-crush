/**
 * Tutorial — 2-step first-run tutorial overlay.
 * Step 1: Where pieces are + tap to rotate
 * Step 2: Complete a row or column to clear
 * Only shows once (persisted via localStorage).
 */
export class Tutorial {
    constructor() {
        this._key = 'blockcrush_tutorial_done';
        this._overlay = null;
        this._step = 0;
        this._totalSteps = 2;
        this._onComplete = null;
    }

    /** Returns true if tutorial has been completed before */
    get completed() {
        try {
            return localStorage.getItem(this._key) === '1';
        } catch {
            return false;
        }
    }

    /**
     * Show tutorial if not completed.
     * @param {Function} onComplete — called when tutorial is dismissed
     */
    show(onComplete) {
        if (this.completed) {
            onComplete?.();
            return;
        }

        this._onComplete = onComplete;
        this._step = 0;
        this._createOverlay();
        this._renderStep();
    }

    _createOverlay() {
        this._overlay = document.createElement('div');
        this._overlay.id = 'tutorial-overlay';
        Object.assign(this._overlay.style, {
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
        document.body.appendChild(this._overlay);
        requestAnimationFrame(() => {
            this._overlay.style.opacity = '1';
        });
    }

    _renderStep() {
        this._overlay.innerHTML = '';

        const card = document.createElement('div');
        Object.assign(card.style, {
            background: 'linear-gradient(145deg, #3a2a15, #2a1e0e)',
            border: '1px solid rgba(184, 137, 74, 0.3)',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '320px',
            width: '85%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            transform: 'scale(0.9)',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        });
        requestAnimationFrame(() => {
            card.style.transform = 'scale(1)';
        });

        // Step indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = 'font-size:12px;color:rgba(212,168,92,0.5);margin-bottom:16px;letter-spacing:2px;';
        indicator.textContent = `${this._step + 1} / ${this._totalSteps}`;
        card.appendChild(indicator);

        if (this._step === 0) {
            this._renderStep1(card);
        } else {
            this._renderStep2(card);
        }

        // Button
        const btn = document.createElement('button');
        const isLast = this._step >= this._totalSteps - 1;
        btn.textContent = isLast ? 'ゲーム開始！' : '次へ →';
        Object.assign(btn.style, {
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
            marginTop: '24px',
            boxShadow: '0 4px 15px rgba(138,101,53,0.4)',
        });
        btn.addEventListener('click', () => this._next());
        btn.addEventListener('touchend', (e) => { e.preventDefault(); this._next(); });
        card.appendChild(btn);

        this._overlay.appendChild(card);
    }

    _renderStep1(card) {
        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-size:22px;font-weight:900;color:#e8c47a;margin-bottom:20px;';
        title.textContent = '🪵 ブロックの操作';
        card.appendChild(title);

        // Illustration: tray area with arrow
        const illust = document.createElement('div');
        illust.style.cssText = 'font-size:48px;margin-bottom:16px;';
        illust.textContent = '👆';
        card.appendChild(illust);

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:14px;color:#d4a85c;line-height:1.8;';
        desc.innerHTML = `
            画面下のブロックを<br>
            <span style="color:#e8c47a;font-weight:700;font-size:16px;">ドラッグ</span>してボードに配置<br><br>
            <span style="color:#e8c47a;font-weight:700;font-size:16px;">タップ</span>でブロックを回転 🔄
        `;
        card.appendChild(desc);
    }

    _renderStep2(card) {
        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-size:22px;font-weight:900;color:#e8c47a;margin-bottom:20px;';
        title.textContent = '✨ ライン消去';
        card.appendChild(title);

        // Illustration: row + column clear
        const illust = document.createElement('div');
        illust.style.cssText = 'font-size:14px;color:#b8894a;margin-bottom:16px;line-height:1.4;';
        illust.innerHTML = `
            <div style="display:flex;justify-content:center;gap:24px;margin-bottom:12px;">
                <div>
                    <div style="font-size:32px;">➡️</div>
                    <div style="font-size:11px;margin-top:4px;">横一列</div>
                </div>
                <div>
                    <div style="font-size:32px;">⬇️</div>
                    <div style="font-size:11px;margin-top:4px;">縦一列</div>
                </div>
            </div>
        `;
        card.appendChild(illust);

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:14px;color:#d4a85c;line-height:1.8;';
        desc.innerHTML = `
            横<span style="color:#e8c47a;font-weight:700;">または</span>縦の列を<br>
            ブロックで<span style="color:#e8c47a;font-weight:700;font-size:16px;">一列埋める</span>と消去！<br><br>
            <span style="font-size:12px;color:#b8894a;">連続消去でコンボボーナス 🔥</span>
        `;
        card.appendChild(desc);
    }

    _next() {
        this._step++;
        if (this._step >= this._totalSteps) {
            this._dismiss();
        } else {
            this._renderStep();
        }
    }

    _dismiss() {
        try {
            localStorage.setItem(this._key, '1');
        } catch { /* ignore */ }

        this._overlay.style.opacity = '0';
        setTimeout(() => {
            this._overlay?.remove();
            this._overlay = null;
            this._onComplete?.();
        }, 300);
    }

    /** Reset tutorial (for testing) */
    reset() {
        try {
            localStorage.removeItem(this._key);
        } catch { /* ignore */ }
    }
}
