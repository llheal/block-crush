/**
 * SoundManager — Nature-themed audio.
 * BGM: Gentle acoustic melody with marimba/kalimba-like tones.
 * SFX: Wood-themed sounds (thud, crack, splinter).
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
        this._initialized = false;
        this._bgmPlaying = false;
        this._bgmTimer = null;
        this._reverb = null;
    }

    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.5;
            this.sfxGain.connect(this.masterGain);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0.18;
            this.bgmGain.connect(this.masterGain);

            this._reverb = this._createReverb();
            this._initialized = true;
        } catch (e) {
            console.warn('[Sound] Web Audio not available:', e.message);
        }
    }

    _ensureContext() {
        if (!this._initialized) this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
    }

    // ===================== REVERB =====================

    _createReverb() {
        const ctx = this.ctx;
        const convolver = ctx.createConvolver();
        const rate = ctx.sampleRate;
        const length = rate * 2.0;
        const impulse = ctx.createBuffer(2, length, rate);

        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
            }
        }
        convolver.buffer = impulse;

        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.35;
        convolver.connect(wetGain);

        return { convolver, wetGain };
    }

    _connectWithReverb(source, destination) {
        source.connect(destination);
        source.connect(this._reverb.convolver);
        this._reverb.wetGain.connect(destination);
    }

    // ===================== WOOD SFX =====================

    /** Solid wood thud when placing a piece */
    playPlace() {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // Deep wood thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.18);

        // Knock resonance
        const knock = this.ctx.createOscillator();
        const knockGain = this.ctx.createGain();
        knock.type = 'triangle';
        knock.frequency.setValueAtTime(500, t);
        knock.frequency.exponentialRampToValueAtTime(200, t + 0.05);
        knockGain.gain.setValueAtTime(0.12, t);
        knockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        knock.connect(knockGain);
        knockGain.connect(this.sfxGain);
        knock.start(t);
        knock.stop(t + 0.08);
    }

    /** Wood cracking and breaking when lines clear */
    playClear(lineCount) {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // CRACK: sharp noise burst
        this._playNoiseBurst(t, 0.08, 0.35, 3000);

        // Splintering: rapid descending crackles
        for (let i = 0; i < 3 + lineCount; i++) {
            const delay = i * 0.04 + Math.random() * 0.02;
            this._playNoiseBurst(t + delay, 0.04, 0.15, 2000 + Math.random() * 2000);
        }

        // Deep impact
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(80, t);
        bass.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        bassGain.gain.setValueAtTime(0.3, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        bass.connect(bassGain);
        bassGain.connect(this.sfxGain);
        bass.start(t);
        bass.stop(t + 0.35);

        // Satisfying wood resonance (warm tone)
        const res = this.ctx.createOscillator();
        const resGain = this.ctx.createGain();
        res.type = 'sine';
        res.frequency.setValueAtTime(220 + lineCount * 50, t + 0.05);
        resGain.gain.setValueAtTime(0.15, t + 0.05);
        resGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        res.connect(resGain);
        this._connectWithReverb(resGain, this.sfxGain);
        res.start(t + 0.05);
        res.stop(t + 0.4);
    }

    /** Combo: ascending koto arpeggio */
    playCombo(comboLevel) {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // Japanese in-sen scale for combos
        const insen = [293, 311, 392, 440, 523, 587, 622, 784];
        for (let i = 0; i < Math.min(comboLevel + 1, 5); i++) {
            const noteIdx = Math.min(i + comboLevel - 1, insen.length - 1);
            this._playKotoNote(insen[noteIdx], t + i * 0.08, 0.3, 0.15);
        }
    }

    /** Game over — descending koto */
    playGameOver() {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const notes = [440, 392, 311, 293]; // A4→D4 (in-sen descent)
        for (let i = 0; i < notes.length; i++) {
            this._playKotoNote(notes[i], t + i * 0.3, 0.9, 0.18);
        }
    }

    /** Pick up piece: light wood tap */
    playPickup() {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.06);
    }

    /** Rotate piece: soft click */
    playRotate() {
        this._ensureContext();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(600, t + 0.02);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    // ===================== KOTO NOTE (for BGM & combos) =====================

    /**
     * Koto-like tone: sharp pluck attack with triangle fundamental,
     * 2nd and 3rd partials for metallic string resonance.
     * Long resonant tail with high-frequency rolloff.
     */
    _playKotoNote(freq, startTime, duration, volume = 0.1) {
        const ctx = this.ctx;

        // Fundamental — triangle wave for koto pluck character
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, startTime);
        g1.gain.setValueAtTime(0, startTime);
        g1.gain.linearRampToValueAtTime(volume, startTime + 0.003); // sharp pluck
        g1.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.03);
        g1.gain.exponentialRampToValueAtTime(volume * 0.15, startTime + duration * 0.4);
        g1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc1.connect(g1);
        this._connectWithReverb(g1, this.bgmGain);
        osc1.start(startTime);
        osc1.stop(startTime + duration + 0.2);

        // 2nd partial — slightly detuned for shimmer
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2.003, startTime);
        g2.gain.setValueAtTime(0, startTime);
        g2.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.3);
        osc2.connect(g2);
        g2.connect(this.bgmGain);
        osc2.start(startTime);
        osc2.stop(startTime + duration * 0.4);

        // High partial — bright metallic attack
        const osc3 = ctx.createOscillator();
        const g3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 4.01, startTime);
        g3.gain.setValueAtTime(0, startTime);
        g3.gain.linearRampToValueAtTime(volume * 0.08, startTime + 0.001);
        g3.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
        osc3.connect(g3);
        g3.connect(this.bgmGain);
        osc3.start(startTime);
        osc3.stop(startTime + 0.1);
    }

    // ===================== NOISE BURST =====================

    _playNoiseBurst(startTime, duration, volume, filterFreq = 2000) {
        const ctx = this.ctx;
        const length = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start(startTime);
    }

    // ===================== WAFUU BGM (琴風) =====================

    startBGM() {
        this._ensureContext();
        if (!this.ctx || this._bgmPlaying) return;
        this._bgmPlaying = true;
        this._currentPhraseIndex = 0;
        this._playWafuuMusicLoop();
    }

    stopBGM() {
        this._bgmPlaying = false;
        if (this._bgmTimer) {
            clearTimeout(this._bgmTimer);
            this._bgmTimer = null;
        }
    }

    /**
     * Japanese wafuu BGM: koto-like plucked strings using
     * miyako-bushi / in-sen scale. Slow, contemplative phrases
     * with grace notes and octave leaps typical of traditional koto.
     *
     * Scale: D4=293, Eb4=311, G4=392, A4=440, C5=523
     *        D5=587, Eb5=622, G5=784, A5=880
     */
    _playWafuuMusicLoop() {
        if (!this._bgmPlaying || !this.ctx) return;

        const phrases = [
            // Phrase 1: 桜 (Sakura opening) — classic descending koto motif
            [
                { n: 587, d: 0, dur: 1.5 },     // D5
                { n: 523, d: 0.8, dur: 1.2 },   // C5
                { n: 440, d: 1.6, dur: 1.8 },   // A4
                { n: 392, d: 2.8, dur: 0.4 },   // G4 grace
                { n: 440, d: 3.1, dur: 2.0 },   // A4
                { n: 293, d: 4.5, dur: 2.5 },   // D4 (root, long)
            ],
            // Phrase 2: 水面 (Water surface) — gentle rippling
            [
                { n: 392, d: 0, dur: 0.6 },     // G4
                { n: 440, d: 0.4, dur: 0.5 },   // A4
                { n: 523, d: 0.8, dur: 1.0 },   // C5
                { n: 440, d: 1.5, dur: 0.5 },   // A4
                { n: 392, d: 2.0, dur: 0.6 },   // G4
                { n: 311, d: 2.6, dur: 1.5 },   // Eb4
                { n: 293, d: 3.6, dur: 2.0 },   // D4
            ],
            // Phrase 3: 紅葉 (Autumn leaves) — ascending with leaps
            [
                { n: 293, d: 0, dur: 1.0 },     // D4
                { n: 311, d: 0.6, dur: 0.5 },   // Eb4 grace
                { n: 392, d: 1.0, dur: 1.2 },   // G4
                { n: 587, d: 1.8, dur: 0.8 },   // D5 (octave leap)
                { n: 523, d: 2.5, dur: 1.0 },   // C5
                { n: 440, d: 3.2, dur: 1.5 },   // A4
                { n: 392, d: 4.2, dur: 2.5 },   // G4
            ],
            // Phrase 4: 風鈴 (Wind bell) — high sparkle
            [
                { n: 784, d: 0, dur: 0.3 },     // G5
                { n: 622, d: 0.2, dur: 0.4 },   // Eb5
                { n: 587, d: 0.5, dur: 1.0 },   // D5
                { n: 523, d: 1.2, dur: 0.6 },   // C5
                { n: 440, d: 1.7, dur: 1.5 },   // A4
                { n: 392, d: 2.8, dur: 1.0 },   // G4
                { n: 311, d: 3.5, dur: 1.5 },   // Eb4
                { n: 293, d: 4.5, dur: 2.5 },   // D4
            ],
            // Phrase 5: 静寂 (Stillness) — sparse, meditative
            [
                { n: 440, d: 0, dur: 2.0 },     // A4 (long)
                { n: 392, d: 1.8, dur: 1.5 },   // G4
                { n: 293, d: 3.5, dur: 3.0 },   // D4 (very long, fading)
            ],
            // Phrase 6: 祭り (Festival hint) — rhythmic pattern
            [
                { n: 587, d: 0, dur: 0.4 },     // D5
                { n: 523, d: 0.3, dur: 0.3 },   // C5
                { n: 587, d: 0.5, dur: 0.6 },   // D5
                { n: 440, d: 1.0, dur: 1.0 },   // A4
                { n: 392, d: 1.8, dur: 0.6 },   // G4
                { n: 311, d: 2.3, dur: 0.5 },   // Eb4
                { n: 293, d: 2.7, dur: 1.0 },   // D4
                { n: 392, d: 3.5, dur: 2.0 },   // G4 (resolve)
            ],
        ];

        const phraseIdx = this._currentPhraseIndex % phrases.length;
        this._currentPhraseIndex++;
        const phrase = phrases[phraseIdx];
        const beatDuration = 0.6; // slightly slower, contemplative
        const t = this.ctx.currentTime + 0.1;

        let maxEnd = 0;
        for (const note of phrase) {
            const startTime = t + note.d * beatDuration;
            const dur = note.dur * beatDuration;
            this._playKotoNote(note.n, startTime, dur, 0.12);

            // Occasional low octave drone (very quiet)
            if (note.d === 0 && Math.random() > 0.5) {
                this._playKotoNote(note.n / 2, startTime + 0.02, dur * 1.5, 0.03);
            }

            const end = note.d * beatDuration + dur;
            if (end > maxEnd) maxEnd = end;
        }

        // Schedule next phrase with breathing pause
        const totalDuration = maxEnd + 2.0; // longer pause for contemplative feel
        this._bgmTimer = setTimeout(() => {
            this._playWafuuMusicLoop();
        }, totalDuration * 1000);
    }

    // ===================== VOLUME CONTROL =====================

    setSFXVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
    }

    setBGMVolume(v) {
        if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, v));
    }

    setMasterVolume(v) {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
}
