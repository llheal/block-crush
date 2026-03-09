import { classicTheme } from './themes/classic.js';

/**
 * ThemeManager — manages the current theme and provides accessors.
 * Designed for easy future theme swapping (e.g., "cat" theme).
 */
export class ThemeManager {
    constructor() {
        this._themes = new Map();
        this._themes.set('classic', classicTheme);
        this._current = classicTheme;
    }

    registerTheme(theme) {
        this._themes.set(theme.name, theme);
    }

    setTheme(name) {
        const theme = this._themes.get(name);
        if (theme) {
            this._current = theme;
            return true;
        }
        return false;
    }

    get current() {
        return this._current;
    }

    getBlockColor(colorId) {
        return this._current.colors[colorId] || 0xffffff;
    }

    getBlockColorDark(colorId) {
        return this._current.colorsDark[colorId] || 0xaaaaaa;
    }

    getBlockColorLight(colorId) {
        return this._current.colorsLight[colorId] || 0xffffff;
    }
}
