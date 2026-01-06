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
        color: '#00ADEF',
        rgb: 'rgb(0, 173, 239)',
        description: 'Cyan / Turquoise Blue',
        source: 'Wikidata',
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
        color: '#FF6600',
        rgb: 'rgb(255, 102, 0)',
        description: 'Safety Orange / Cadmium Orange',
        source: 'Common election visualizations',
        confirmed: false,
        alternative: '#FF9933' // Alternative orange shade
    },
    'Chega': {
        name: 'Chega',
        color: '#0093DD',
        rgb: 'rgb(0, 147, 221)',
        description: 'Pacific Blue',
        source: 'Election maps (blue)',
        confirmed: false,
        alternative: '#4169E1' // Royal Blue alternative
    },
    'CDS-PP': {
        name: 'CDS - Partido Popular',
        color: '#4BA5E8',
        rgb: 'rgb(75, 165, 232)',
        description: 'Light/Celestial Blue',
        source: 'Common usage',
        confirmed: false
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
        color: '#32CD32',
        rgb: 'rgb(50, 205, 50)',
        description: 'Lime Green',
        source: 'Common usage (green background)',
        confirmed: false,
        secondary: '#DC143C' // Red for poppy symbol
    }
};

// Simplified map for quick lookups (just the hex colors)
const PARTY_COLOR_MAP = {
    'PS': '#FF66FF',
    'PSD': '#FF6600',
    'Chega': '#0093DD',
    'IL': '#00ADEF',
    'BE': '#000000',
    'PCP': '#FF0000',
    'CDS-PP': '#4BA5E8',
    'PAN': '#00A651',
    'Livre': '#32CD32'
};

// Get party color with fallback
function getPartyColor(partyAbbreviation, defaultColor = '#CCCCCC') {
    return PARTY_COLOR_MAP[partyAbbreviation] || defaultColor;
}

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PARTY_COLORS, PARTY_COLOR_MAP, getPartyColor };
}
