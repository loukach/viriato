/**
 * Map 60+ legislative phases to 7 simplified categories
 * Addresses pain point: "Legislative process is incomprehensible"
 */

export type StatusCategory =
  | 'submitted'
  | 'announced'
  | 'discussion'
  | 'voting'
  | 'finalizing'
  | 'approved'
  | 'rejected'

export interface StatusInfo {
  category: StatusCategory
  label: string
  cssClass: string
  color: string
}

export const STATUS_CONFIG: Record<StatusCategory, Omit<StatusInfo, 'category'>> = {
  submitted: { label: 'Submetida', cssClass: 'status-submitted', color: '#9ca3af' },
  announced: { label: 'Anunciada', cssClass: 'status-announced', color: '#38bdf8' },
  discussion: { label: 'Em discussao', cssClass: 'status-discussion', color: '#3b82f6' },
  voting: { label: 'Em votacao', cssClass: 'status-voting', color: '#f97316' },
  finalizing: { label: 'A finalizar', cssClass: 'status-finalizing', color: '#8b5cf6' },
  approved: { label: 'Aprovada', cssClass: 'status-approved', color: '#10b981' },
  rejected: { label: 'Rejeitada', cssClass: 'status-rejected', color: '#ef4444' },
}

/**
 * Map a status string to one of 7 simplified categories
 */
export function getStatusCategory(status: string | null | undefined): StatusInfo {
  if (!status || status === 'Desconhecido') {
    return { category: 'submitted', ...STATUS_CONFIG.submitted }
  }

  const s = status.toLowerCase()

  // Approved (final positive states)
  if (
    s.includes('lei (publicacao dr)') ||
    s.includes('lei (publicação dr)') ||
    s.includes('resolucao da ar (publicacao dr)') ||
    s.includes('resolução da ar (publicação dr)') ||
    s.includes('deliberacao (publicacao dr)') ||
    s.includes('deliberação (publicação dr)')
  ) {
    return { category: 'approved', ...STATUS_CONFIG.approved }
  }

  // Rejected (final negative states)
  if (s.includes('rejeitad') || s.includes('retirada') || s.includes('caducad')) {
    return { category: 'rejected', ...STATUS_CONFIG.rejected }
  }

  // Finalizing (post-vote, pre-publication)
  if (
    s.includes('promulgacao') ||
    s.includes('promulgação') ||
    s.includes('referenda') ||
    s.includes('redacao final') ||
    s.includes('redação final') ||
    s.includes('envio incm') ||
    s.includes('decreto (publicacao)') ||
    s.includes('decreto (publicação)') ||
    s.includes('resolucao (publicacao dar)') ||
    s.includes('resolução (publicação dar)') ||
    s.includes('envio a comissao para fixacao') ||
    s.includes('envio à comissão para fixação')
  ) {
    return { category: 'finalizing', ...STATUS_CONFIG.finalizing }
  }

  // Voting (critical decision points)
  if (s.includes('votacao') || s.includes('votação')) {
    return { category: 'voting', ...STATUS_CONFIG.voting }
  }

  // In Discussion (active debate)
  if (
    s.includes('discussao') ||
    s.includes('discussão') ||
    s.includes('apreciacao') ||
    s.includes('apreciação') ||
    s.includes('parecer')
  ) {
    return { category: 'discussion', ...STATUS_CONFIG.discussion }
  }

  // Announced (committee assignment, waiting for discussion)
  if (
    s.includes('anuncio') ||
    s.includes('anúncio') ||
    s.includes('baixa comissao') ||
    s.includes('baixa comissão') ||
    s.includes('separata')
  ) {
    return { category: 'announced', ...STATUS_CONFIG.announced }
  }

  // Submitted (initial stages)
  if (
    s.includes('entrada') ||
    s.includes('publicacao') ||
    s.includes('publicação') ||
    s.includes('admissao') ||
    s.includes('admissão')
  ) {
    return { category: 'submitted', ...STATUS_CONFIG.submitted }
  }

  // Default to announced for unknown active phases
  return { category: 'announced', label: 'Em progresso', cssClass: 'status-announced', color: '#38bdf8' }
}

/**
 * Get all status categories in funnel order
 */
export function getStatusCategoriesInOrder(): { category: StatusCategory; label: string; color: string }[] {
  return [
    { category: 'submitted', ...STATUS_CONFIG.submitted },
    { category: 'announced', ...STATUS_CONFIG.announced },
    { category: 'discussion', ...STATUS_CONFIG.discussion },
    { category: 'voting', ...STATUS_CONFIG.voting },
    { category: 'finalizing', ...STATUS_CONFIG.finalizing },
    { category: 'approved', ...STATUS_CONFIG.approved },
    { category: 'rejected', ...STATUS_CONFIG.rejected },
  ]
}
