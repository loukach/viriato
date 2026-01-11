/**
 * API client for Viriato backend
 */

export const API_URL = 'https://viriato-api.onrender.com'

/**
 * Fetch wrapper with error handling
 */
export async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return response.json()
}

// API Types

export interface OrgaoMembership {
  name: string
  acronym: string
  role: string | null
  member_type: string | null
}

export interface Deputy {
  dep_id: number
  name: string
  full_name?: string
  party: string
  circulo: string
  gender: 'M' | 'F' | null
  age: number | null
  profession: string | null
  education: string | null
  situation: string
  replaces?: string | string[]
  comissoes: OrgaoMembership[]
  grupos_trabalho: OrgaoMembership[]
}

export interface DeputadosResponse {
  deputados: Deputy[]
  summary: {
    total: number
    party_composition: Record<string, number>
    gender_breakdown: Record<string, number>
    circulo_breakdown: Record<string, number>
  }
}

export interface Initiative {
  IniId: number
  IniNr: number
  IniTipo: string
  IniDescTipo: string
  IniTitulo: string
  DataInicioleg: string
  IniEventos: InitiativeEvent[]
  IniAutorGruposParlamentares?: { GP: string }[] | { GP: string }
  IniAutorOutros?: { nome: string }
  _currentStatus: string
  _isCompleted: boolean
}

export interface InitiativeEvent {
  Fase: string
  DataFase: string
}

export interface AgendaEvent {
  event_id: number
  event_type: string
  title: string
  subtitle: string
  start_date: string
  end_date: string
  room: string
  committee_id: number | null
}

export interface Committee {
  org_id: number
  name: string
  total_members: number
  parties: Record<string, number>
  ini_authored: number
  ini_in_progress: number
  ini_approved: number
  ini_rejected: number
}

export interface LinkedInitiative {
  ini_id: number
  title: string
  type: string
  type_description: string
  status: string
  current_status?: string
  author?: string
  author_name?: string
  number?: number
  text_link?: string
  is_completed?: boolean
}

export interface Legislature {
  legislature: string
  count: number
  label: string
}

// API Functions

export async function fetchDeputados(): Promise<DeputadosResponse> {
  return fetchApi<DeputadosResponse>('/api/deputados')
}

export async function fetchInitiatives(legislature?: string): Promise<Initiative[]> {
  const query = legislature && legislature !== 'all' ? `?legislature=${legislature}` : ''
  return fetchApi<Initiative[]>(`/api/iniciativas${query}`)
}

export async function fetchAgenda(): Promise<AgendaEvent[]> {
  return fetchApi<AgendaEvent[]>('/api/agenda')
}

export async function fetchAgendaInitiatives(eventId: number): Promise<{
  initiatives: LinkedInitiative[]
  description: string
}> {
  return fetchApi(`/api/agenda/${eventId}/initiatives`)
}

export async function fetchCommittees(): Promise<Committee[]> {
  return fetchApi<Committee[]>('/api/orgaos/summary')
}

export async function fetchCommitteeDetails(orgId: number): Promise<{
  initiatives: {
    initiative: LinkedInitiative
    link_type: string
    has_vote: boolean
    vote_result: string
    has_rapporteur: boolean
  }[]
  agenda_events: AgendaEvent[]
}> {
  return fetchApi(`/api/orgaos/${orgId}`)
}

export async function fetchLegislatures(): Promise<Legislature[]> {
  return fetchApi<Legislature[]>('/api/legislatures')
}

export async function searchInitiatives(query: string, legislature?: string): Promise<Initiative[]> {
  const params = new URLSearchParams({ q: query })
  if (legislature && legislature !== 'all') {
    params.append('legislature', legislature)
  }
  return fetchApi<Initiative[]>(`/api/search?${params}`)
}
