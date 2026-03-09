/**
 * Natural wood theme — warm brown tones on forest green background
 */
export const classicTheme = {
    name: 'classic',

    // Background & board
    bgColor: 0x2d5016,         // Deep forest green
    boardBg: 0x3a6b1e,         // Slightly lighter green
    cellEmpty: 0x2a4a14,       // Dark green grid cell
    cellEmptyAlt: 0x264412,    // Slightly darker alt cell
    gridLine: 0x4a8030,        // Green grid lines

    // Ghost preview
    ghostValid: 0x88cc55,      // Light green = valid
    ghostInvalid: 0xcc5544,    // Red = invalid

    // Wood colors — single warm brown palette (all blocks same color)
    woodBase: 0xb8894a,        // Warm oak base
    woodDark: 0x8a6535,        // Darker wood grain
    woodLight: 0xd4a85c,       // Light wood highlight
    woodGrain: 0x7a5528,       // Grain line color
    woodHighlight: 0xe8c47a,   // Polished highlight

    // Legacy color accessors (all map to same wood tones)
    colors: [
        null,
        0xb8894a, 0xb8894a, 0xb8894a,
        0xb8894a, 0xb8894a, 0xb8894a,
    ],
    colorsDark: [
        null,
        0x8a6535, 0x8a6535, 0x8a6535,
        0x8a6535, 0x8a6535, 0x8a6535,
    ],
    colorsLight: [
        null,
        0xd4a85c, 0xd4a85c, 0xd4a85c,
        0xd4a85c, 0xd4a85c, 0xd4a85c,
    ],

    // Effects
    particleColor: 0xd4a85c,
    comboColors: ['#d4a85c', '#b8894a', '#8a6535', '#e8c47a'],

    // Wood splinter colors for break effect
    splinterColors: [0xb8894a, 0x8a6535, 0xd4a85c, 0x7a5528, 0xe8c47a, 0x9a7540],
};
