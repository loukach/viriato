/**
 * Agenda event types and colors
 */

export type EventType =
  | 'plenario'
  | 'comissoes'
  | 'grupos'
  | 'lideres'
  | 'trabalho'
  | 'visitas'
  | 'assistencias'

export interface EventTypeConfig {
  key: EventType
  label: string
  color: string
  bgClass: string
}

export const EVENT_TYPES: EventTypeConfig[] = [
  { key: 'plenario', label: 'Plenario', color: '#16a34a', bgClass: 'bg-green-600' },
  { key: 'comissoes', label: 'Comissoes', color: '#2563eb', bgClass: 'bg-blue-600' },
  { key: 'grupos', label: 'Grupos Parlamentares', color: '#9333ea', bgClass: 'bg-purple-600' },
  { key: 'lideres', label: 'Conf. Lideres', color: '#06b6d4', bgClass: 'bg-cyan-500' },
  { key: 'trabalho', label: 'Grupos Trabalho', color: '#ec4899', bgClass: 'bg-pink-500' },
  { key: 'visitas', label: 'Visitas', color: '#f59e0b', bgClass: 'bg-amber-500' },
  { key: 'assistencias', label: 'Assistencias', color: '#6b7280', bgClass: 'bg-gray-500' },
]

/**
 * Map event_type from API to internal type key
 */
export function getEventTypeKey(eventType: string): EventType {
  const typeMap: Record<string, EventType> = {
    // Plenary sessions - raw API values
    'Plenário': 'plenario',
    'Reunião Plenária': 'plenario',
    'Sessão Plenária': 'plenario',
    'Reuniões Plenárias': 'plenario',
    'Plenario': 'plenario',
    'Reuniao Plenaria': 'plenario',
    'Sessao Plenaria': 'plenario',

    // Committee meetings - raw API values
    'Comissões Parlamentares': 'comissoes',
    'Comissão Parlamentar': 'comissoes',
    'Reuniao de Comissao': 'comissoes',
    'Comissao': 'comissoes',
    'Comissoes': 'comissoes',

    // Parliamentary groups - raw API value
    'Grupos Parlamentares / Partidos / DURP / Ninsc': 'grupos',
    'Grupos Parlamentares': 'grupos',
    'Grupo Parlamentar': 'grupos',
    'Reuniao GP': 'grupos',

    // Leaders conference
    'Conferência de Líderes': 'lideres',
    'Conferencia de Lideres': 'lideres',
    'Conf. Lideres': 'lideres',

    // Working groups
    'Grupo de Trabalho': 'trabalho',
    'Grupos de Trabalho': 'trabalho',
    'GT': 'trabalho',

    // Visits - raw API value
    'Visitas ao Palácio de S. Bento': 'visitas',
    'Visitas ao Palacio de S. Bento': 'visitas',
    'Visitas Escolares': 'visitas',
    'Visita de Estudo': 'visitas',
    'Visita Escola': 'visitas',
    'Visita': 'visitas',

    // Assistances - raw API value
    'Assistências ao Plenário': 'assistencias',
    'Assistencias ao Plenario': 'assistencias',
    'Assistências em Plenário': 'assistencias',
    'Assistencia Plenario': 'assistencias',
    'Assistencia': 'assistencias',

    // President's agenda - map to plenario (official acts)
    'Agenda do Presidente da Assembleia da República': 'plenario',
    'Agenda do Presidente da Assembleia da Republica': 'plenario',

    // Calendar summary - map to comissoes as fallback
    'Resumo da Calendarização': 'comissoes',
    'Resumo da Calendarizacao': 'comissoes',
  }

  return typeMap[eventType] || 'comissoes'
}

/**
 * Get event type configuration
 */
export function getEventTypeConfig(eventType: string): EventTypeConfig {
  const key = getEventTypeKey(eventType)
  return EVENT_TYPES.find((t) => t.key === key) || EVENT_TYPES[1] // default to comissoes
}
