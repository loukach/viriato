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
    // Plenary sessions
    'Reuniao Plenaria': 'plenario',
    'Sessao Plenaria': 'plenario',
    'Reuniões Plenárias': 'plenario',
    Plenario: 'plenario',

    // Committee meetings
    'Reuniao de Comissao': 'comissoes',
    Comissao: 'comissoes',
    Comissoes: 'comissoes',
    'Comissões Parlamentares': 'comissoes',

    // Parliamentary groups
    'Reuniao GP': 'grupos',
    'Grupo Parlamentar': 'grupos',
    'Grupos Parlamentares': 'grupos',

    // Leaders conference
    'Conferencia de Lideres': 'lideres',
    'Conf. Lideres': 'lideres',
    'Conferência de Líderes': 'lideres',

    // Working groups
    'Grupo de Trabalho': 'trabalho',
    'Grupos de Trabalho': 'trabalho',
    'GT': 'trabalho',

    // Visits
    Visita: 'visitas',
    'Visita de Estudo': 'visitas',
    'Visita Escola': 'visitas',
    'Visitas Escolares': 'visitas',

    // Assistances (non-legislative plenary)
    Assistencia: 'assistencias',
    'Assistencia Plenario': 'assistencias',
    'Assistências em Plenário': 'assistencias',
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
