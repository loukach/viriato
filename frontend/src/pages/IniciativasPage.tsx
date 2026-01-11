import { useState, useMemo, useCallback } from 'react'
import { useInitiatives, useSearch } from '../hooks/useInitiatives'
import { LifecycleFunnel } from '../components/LifecycleFunnel'
import { TypeWidget } from '../components/TypeWidget'
import { MonthWidget } from '../components/MonthWidget'
import { AuthorWidget } from '../components/AuthorWidget'
import { InitiativeCard } from '../components/InitiativeCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { FilterPills } from '../components/FilterPills'
import { getStatusCategory, type StatusCategory } from '../lib/statusCategories'
import { getMonthKey } from '../lib/formatDate'

const LEGISLATURES = [
  { value: 'XVII', label: 'XVII (2025-presente)' },
  { value: 'XVI', label: 'XVI (2024-2025)' },
  { value: 'XV', label: 'XV (2022-2024)' },
  { value: 'XIV', label: 'XIV (2019-2022)' },
  { value: 'all', label: 'Todas' },
]

const SORT_OPTIONS = [
  { value: 'date-newest', label: 'Data (mais recentes)' },
  { value: 'date-oldest', label: 'Data (mais antigas)' },
  { value: 'phase', label: 'Fase do processo' },
]

// Phase order for sorting (progress in the legislative process)
const PHASE_ORDER: Record<string, number> = {
  submitted: 0,
  announced: 1,
  discussion: 2,
  voting: 3,
  finalizing: 4,
  approved: 5,
  rejected: 6,
}

interface Filters {
  types: string[]
  authors: string[]
  months: string[]
  phases: StatusCategory[]
}

const EMPTY_FILTERS: Filters = {
  types: [],
  authors: [],
  months: [],
  phases: [],
}

export function IniciativasPage() {
  const [legislature, setLegislature] = useState('XVII')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState('date-newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: initiatives, isLoading, isError, refetch } = useInitiatives(legislature)
  const { data: searchResults, isLoading: isSearching } = useSearch(searchQuery, legislature)

  // Toggle helpers for each filter category
  const toggleType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }))
  }, [])

  const toggleAuthor = useCallback((author: string) => {
    setFilters((prev) => ({
      ...prev,
      authors: prev.authors.includes(author)
        ? prev.authors.filter((a) => a !== author)
        : [...prev.authors, author],
    }))
  }, [])

  const toggleMonth = useCallback((month: string) => {
    setFilters((prev) => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter((m) => m !== month)
        : [...prev.months, month],
    }))
  }, [])

  const togglePhase = useCallback((phase: StatusCategory) => {
    setFilters((prev) => ({
      ...prev,
      phases: prev.phases.includes(phase)
        ? prev.phases.filter((p) => p !== phase)
        : [...prev.phases, phase],
    }))
  }, [])

  const removeFilter = useCallback((category: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: (prev[category] as string[]).filter((v) => v !== value),
    }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  // Use search results if searching, otherwise use all initiatives
  const displayData = searchQuery ? searchResults : initiatives

  // Helper to get initiative month key
  const getInitiativeMonth = useCallback((ini: NonNullable<typeof initiatives>[number]) => {
    const events = ini.IniEventos || []
    if (events.length === 0) return null
    const sortedEvents = [...events].sort((a, b) =>
      (a.DataFase || '').localeCompare(b.DataFase || '')
    )
    const firstDate = sortedEvents[0].DataFase
    return firstDate ? getMonthKey(firstDate) : null
  }, [])

  // Helper to check if initiative matches author filter
  const matchesAuthorFilter = useCallback((ini: NonNullable<typeof initiatives>[number], authorFilters: string[]) => {
    if (authorFilters.length === 0) return true

    // Check Government
    if (authorFilters.includes('Governo') && ini.IniAutorOutros?.nome === 'Governo') {
      return true
    }

    // Check parties
    if (ini.IniAutorGruposParlamentares) {
      const groups = Array.isArray(ini.IniAutorGruposParlamentares)
        ? ini.IniAutorGruposParlamentares
        : [ini.IniAutorGruposParlamentares]

      for (const g of groups) {
        if (g.GP && authorFilters.includes(g.GP)) {
          return true
        }
      }
    }

    // Check "Outros" - initiative has no Government or party author
    if (authorFilters.includes('Outros')) {
      const hasGovernment = ini.IniAutorOutros?.nome === 'Governo'
      const hasParty = ini.IniAutorGruposParlamentares && (
        Array.isArray(ini.IniAutorGruposParlamentares)
          ? ini.IniAutorGruposParlamentares.some((g) => g.GP)
          : ini.IniAutorGruposParlamentares.GP
      )
      if (!hasGovernment && !hasParty) {
        return true
      }
    }

    return false
  }, [])

  // Filter and sort initiatives
  const filteredInitiatives = useMemo(() => {
    if (!displayData) return []

    let filtered = displayData

    // Filter by type
    if (filters.types.length > 0) {
      filtered = filtered.filter((ini) => filters.types.includes(ini.IniTipo))
    }

    // Filter by author
    if (filters.authors.length > 0) {
      filtered = filtered.filter((ini) => matchesAuthorFilter(ini, filters.authors))
    }

    // Filter by month
    if (filters.months.length > 0) {
      filtered = filtered.filter((ini) => {
        const monthKey = getInitiativeMonth(ini)
        return monthKey && filters.months.includes(monthKey)
      })
    }

    // Filter by phase
    if (filters.phases.length > 0) {
      filtered = filtered.filter((ini) => {
        const { category } = getStatusCategory(ini._currentStatus)
        return filters.phases.includes(category)
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date-newest' || sortBy === 'date-oldest') {
        const getFirstDate = (ini: typeof a) => {
          const events = ini.IniEventos || []
          if (events.length === 0) return ''
          const sorted = [...events].sort((e1, e2) =>
            (e1.DataFase || '').localeCompare(e2.DataFase || '')
          )
          return sorted[0].DataFase || ''
        }
        const dateA = getFirstDate(a)
        const dateB = getFirstDate(b)
        return sortBy === 'date-newest'
          ? dateB.localeCompare(dateA)
          : dateA.localeCompare(dateB)
      }

      if (sortBy === 'phase') {
        const phaseA = PHASE_ORDER[getStatusCategory(a._currentStatus).category] ?? 0
        const phaseB = PHASE_ORDER[getStatusCategory(b._currentStatus).category] ?? 0
        return phaseB - phaseA
      }

      return 0
    })

    return sorted
  }, [displayData, filters, sortBy, matchesAuthorFilter, getInitiativeMonth])

  // Split initiatives for funnels
  const lawsInitiatives = useMemo(() => {
    if (!initiatives) return []
    return initiatives.filter((ini) => ini.IniTipo === 'J' || ini.IniTipo === 'P')
  }, [initiatives])

  const resolutionsInitiatives = useMemo(() => {
    if (!initiatives) return []
    return initiatives.filter((ini) => ini.IniTipo === 'R' || ini.IniTipo === 'S')
  }, [initiatives])

  // Stats
  const totalCount = initiatives?.length || 0
  const completedCount = initiatives?.filter((i) => i._isCompleted).length || 0

  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  if (isLoading) {
    return <LoadingSpinner message="A carregar iniciativas..." />
  }

  if (isError) {
    return <ErrorState title="Erro ao carregar iniciativas" onRetry={() => refetch()} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Iniciativas Legislativas</h1>
          <p className="text-gray-600">
            {totalCount} iniciativas | {completedCount} concluidas
          </p>
        </div>

        {/* Legislature selector */}
        <select
          value={legislature}
          onChange={(e) => setLegislature(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          {LEGISLATURES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lifecycle Funnels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <LifecycleFunnel
          initiatives={lawsInitiatives}
          title="Leis (Projetos e Propostas)"
          color="#2563eb"
          selectedPhases={filters.phases}
          onTogglePhase={togglePhase}
        />
        <LifecycleFunnel
          initiatives={resolutionsInitiatives}
          title="Resoluções (Projetos e Propostas)"
          color="#16a34a"
          selectedPhases={filters.phases}
          onTogglePhase={togglePhase}
        />
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <TypeWidget
          initiatives={initiatives || []}
          selectedTypes={filters.types}
          onToggleType={toggleType}
        />
        <MonthWidget
          initiatives={initiatives || []}
          selectedMonths={filters.months}
          onToggleMonth={toggleMonth}
        />
        <AuthorWidget
          initiatives={initiatives || []}
          selectedAuthors={filters.authors}
          onToggleAuthor={toggleAuthor}
        />
      </div>

      {/* Search, Filters, and Sort */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Pesquisar iniciativas..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
            >
              {isSearching ? '...' : 'Pesquisar'}
            </button>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Pills */}
        <FilterPills
          filters={filters}
          onRemove={removeFilter}
          onClearAll={clearAllFilters}
        />

        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            Resultados para "{searchQuery}": {filteredInitiatives.length} iniciativas
          </p>
        )}
      </div>

      {/* Results count when filtered */}
      {(filters.types.length > 0 || filters.authors.length > 0 || filters.months.length > 0 || filters.phases.length > 0) && (
        <p className="text-sm text-gray-600 mb-4">
          A mostrar {filteredInitiatives.length} de {totalCount} iniciativas
        </p>
      )}

      {/* Initiative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInitiatives.slice(0, 50).map((ini) => (
          <InitiativeCard key={ini.IniId} initiative={ini} />
        ))}
      </div>

      {filteredInitiatives.length > 50 && (
        <p className="text-center text-gray-500 mt-6">
          A mostrar 50 de {filteredInitiatives.length} iniciativas. Use a pesquisa para refinar.
        </p>
      )}

      {filteredInitiatives.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma iniciativa encontrada.
        </div>
      )}
    </div>
  )
}
