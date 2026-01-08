/**
 * Portuguese Political Party Colors
 *
 * Official and commonly-used hex colors for Portuguese political parties.
 * Based on Wikipedia political party templates and election visualizations.
 *
 * Last updated: 2026-01-06
 * Sources:
 * - Wikipedia Predefinição:RGBpol
 * - Wikidata party information
 * - Common election visualization standards
 */

const PARTY_COLORS = {
    // Officially confirmed colors (from Wikipedia/Wikidata)
    'PS': {
        name: 'Partido Socialista',
        color: '#FF66FF',
        rgb: 'rgb(255, 102, 255)',
        description: 'Pink Flamingo / Magenta',
        source: 'Wikipedia RGBpol template',
        confirmed: true
    },
    'PCP': {
        name: 'Partido Comunista Português',
        color: '#FF0000',
        rgb: 'rgb(255, 0, 0)',
        description: 'Pure Red',
        source: 'Wikidata',
        confirmed: true
    },
    'IL': {
        name: 'Iniciativa Liberal',
        color: '#00abe4',
        rgb: 'rgb(0, 171, 228)',
        description: 'Light Blue / Cyan',
        source: 'Official party color',
        confirmed: true
    },
    'BE': {
        name: 'Bloco de Esquerda',
        color: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Black (with red accents)',
        source: 'FOTW Flags of the World',
        confirmed: true
    },

    // Commonly used colors (not officially confirmed)
    'PSD': {
        name: 'Partido Social Democrata',
        color: '#FF6500',
        rgb: 'rgb(255, 101, 0)',
        description: 'Orange',
        source: 'Official party color',
        confirmed: true
    },
    'Chega': {
        name: 'Chega',
        color: '#0f3468',
        rgb: 'rgb(15, 52, 104)',
        description: 'Dark Blue',
        source: 'Official party color',
        confirmed: true
    },
    'CDS-PP': {
        name: 'CDS - Partido Popular',
        color: '#0071BC',
        rgb: 'rgb(0, 113, 188)',
        description: 'Blue',
        source: 'Official party color',
        confirmed: true
    },
    'PAN': {
        name: 'Pessoas-Animais-Natureza',
        color: '#00A651',
        rgb: 'rgb(0, 166, 81)',
        description: 'Green (Pigment)',
        source: 'Environmentalist party standard',
        confirmed: false
    },
    'Livre': {
        name: 'Livre',
        color: '#C4D600',
        rgb: 'rgb(196, 214, 0)',
        description: 'Lime / Chartreuse',
        source: 'Official party color',
        confirmed: true
    }
};

// Simplified map for quick lookups (just the hex colors)
const PARTY_COLOR_MAP = {
    'PS': '#FF66FF',
    'PSD': '#FF6500',
    'Chega': '#0f3468',
    'CH': '#0f3468',
    'IL': '#00abe4',
    'BE': '#000000',
    'PCP': '#FF0000',
    'CDS-PP': '#0071BC',
    'PAN': '#00A651',
    'Livre': '#C4D600',
    'L': '#C4D600'
};

// Get party color with fallback
function getPartyColor(partyAbbreviation, defaultColor = '#CCCCCC') {
    return PARTY_COLOR_MAP[partyAbbreviation] || defaultColor;
}

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PARTY_COLORS, PARTY_COLOR_MAP, getPartyColor };
}
