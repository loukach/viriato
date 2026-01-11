import { useState, useMemo } from 'react'
import { useInitiatives, useSearch } from '../hooks/useInitiatives'
import { LifecycleFunnel } from '../components/LifecycleFunnel'
import { TypeWidget } from '../components/TypeWidget'
import { MonthWidget } from '../components/MonthWidget'
import { AuthorWidget } from '../components/AuthorWidget'
import { InitiativeCard } from '../components/InitiativeCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'

const LEGISLATURES = [
  { value: 'XVII', label: 'XVII (2025-presente)' },
  { value: 'XVI', label: 'XVI (2024-2025)' },
  { value: 'XV', label: 'XV (2022-2024)' },
  { value: 'XIV', label: 'XIV (2019-2022)' },
  { value: 'all', label: 'Todas' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'J,P', label: 'Leis' },
  { value: 'R,S', label: 'Resolucoes' },
  { value: 'D', label: 'Deliberacoes' },
  { value: 'I', label: 'Inqueritos' },
  { value: 'A', label: 'Apreciacoes' },
]

export function IniciativasPage() {
  const [legislature, setLegislature] = useState('XVII')
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: initiatives, isLoading, isError, refetch } = useInitiatives(legislature)
  const { data: searchResults, isLoading: isSearching } = useSearch(searchQuery, legislature)

  // Use search results if searching, otherwise use all initiatives
  const displayData = searchQuery ? searchResults : initiatives

  // Filter by type
  const filteredInitiatives = useMemo(() => {
    if (!displayData) return []

    if (typeFilter === 'all') return displayData

    const types = typeFilter.split(',')
    return displayData.filter((ini) => types.includes(ini.IniTipo))
  }, [displayData, typeFilter])

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
        <LifecycleFunnel initiatives={lawsInitiatives} title="Leis (Projetos e Propostas)" />
        <LifecycleFunnel initiatives={resolutionsInitiatives} title="Resolucoes" />
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <TypeWidget initiatives={initiatives || []} />
        <MonthWidget initiatives={initiatives || []} />
        <AuthorWidget initiatives={initiatives || []} />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  typeFilter === f.value
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            Resultados para "{searchQuery}": {filteredInitiatives.length} iniciativas
          </p>
        )}
      </div>

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
