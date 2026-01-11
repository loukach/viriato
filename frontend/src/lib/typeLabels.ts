/**
 * Initiative type codes and labels
 */

export const TYPE_LABELS: Record<string, string> = {
  J: 'Proj. Lei',
  P: 'Prop. Lei',
  R: 'Proj. Res.',
  S: 'Prop. Res.',
  D: 'Deliberacao',
  I: 'Inquerito',
  A: 'Apreciacao',
}

export const TYPE_FULL_NAMES: Record<string, string> = {
  J: 'Projetos de Lei',
  P: 'Propostas de Lei',
  R: 'Projetos de Resolucao',
  S: 'Propostas de Resolucao',
  D: 'Proj. Deliberacao',
  I: 'Inqueritos Parl.',
  A: 'Apreciacoes Parl.',
}

export const TYPE_COLORS: Record<string, string> = {
  R: 'linear-gradient(135deg, #16a34a, #15803d)',
  J: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  P: 'linear-gradient(135deg, #9333ea, #7c3aed)',
  D: 'linear-gradient(135deg, #ea580c, #dc2626)',
  I: 'linear-gradient(135deg, #0891b2, #0e7490)',
  S: 'linear-gradient(135deg, #059669, #047857)',
  A: 'linear-gradient(135deg, #d97706, #b45309)',
}

/**
 * Get short type label
 */
export function getTypeLabel(typeCode: string): string {
  return TYPE_LABELS[typeCode] || typeCode
}

/**
 * Get full type name
 */
export function getTypeFullName(typeCode: string): string {
  return TYPE_FULL_NAMES[typeCode] || typeCode
}

/**
 * Get type gradient color
 */
export function getTypeColor(typeCode: string): string {
  return TYPE_COLORS[typeCode] || 'linear-gradient(135deg, #6b7280, #4b5563)'
}
