/**
 * Official party colors for Portuguese political parties
 * Ordered by political spectrum (right to left, CH at center)
 */

export const PARTY_COLORS: Record<string, string> = {
  'CDS-PP': '#0071BC',  // Blue
  'IL': '#00abe4',      // Light Blue
  'PSD': '#FF6500',     // Orange
  'JPP': '#00ab85',     // Green
  'CH': '#0f3468',      // Dark Blue (Chega)
  'PS': '#FF66FF',      // Pink
  'PAN': '#00798f',     // Teal
  'L': '#C4D600',       // Lime (Livre)
  'BE': '#EE4655',      // Red (Bloco)
  'PCP': '#FF0000',     // Red
}

/**
 * Political spectrum order for sorting parties
 * Right to left, with CH at center
 */
export const PARTY_ORDER = [
  'CDS-PP',
  'IL',
  'PSD',
  'JPP',
  'CH',
  'PS',
  'PAN',
  'L',
  'BE',
  'PCP',
]

/**
 * Get party color, with fallback
 */
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] || '#888888'
}

/**
 * Sort parties by political spectrum
 */
export function sortPartiesBySpectrum(parties: string[]): string[] {
  return [...parties].sort((a, b) => {
    const ai = PARTY_ORDER.indexOf(a)
    const bi = PARTY_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}
