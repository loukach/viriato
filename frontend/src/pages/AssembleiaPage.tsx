import { useState, useMemo } from 'react'
import { useDeputados } from '../hooks/useDeputados'
import { Hemicycle } from '../components/Hemicycle'
import { PartyLegend } from '../components/PartyLegend'
import { DeputyCard } from '../components/DeputyCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { StatCard } from '../components/StatCard'

export function AssembleiaPage() {
  const { data, isLoading, isError, refetch } = useDeputados()

  // Filters state
  const [selectedParty, setSelectedParty] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCirculo, setSelectedCirculo] = useState('')
  const [selectedGender, setSelectedGender] = useState('')

  // Filter deputies
  const filteredDeputados = useMemo(() => {
    if (!data) return []

    return data.deputados.filter((dep) => {
      // Party filter
      if (selectedParty && dep.party !== selectedParty) return false

      // Search filter
      if (searchText && !dep.name.toLowerCase().includes(searchText.toLowerCase())) return false

      // Circulo filter
      if (selectedCirculo && dep.circulo !== selectedCirculo) return false

      // Gender filter
      if (selectedGender && dep.gender !== selectedGender) return false

      return true
    })
  }, [data, selectedParty, searchText, selectedCirculo, selectedGender])

  // Get unique circulos for dropdown
  const circulos = useMemo(() => {
    if (!data) return []
    return Object.keys(data.summary.circulo_breakdown).sort()
  }, [data])

  if (isLoading) {
    return <LoadingSpinner message="A carregar deputados..." />
  }

  if (isError || !data) {
    return <ErrorState title="Erro ao carregar deputados" onRetry={() => refetch()} />
  }

  const { summary } = data
  const { total, party_composition, gender_breakdown } = summary

  // Calculate gender percentage
  const femaleCount = gender_breakdown['F'] || 0
  const femalePercentage = total > 0 ? Math.round((femaleCount / total) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hemicycle Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="relative max-w-xl mx-auto">
          <Hemicycle
            partyComposition={party_composition}
            total={total}
            selectedParty={selectedParty}
            onPartyClick={setSelectedParty}
            size="large"
          />

          {/* Center total */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            <div className="text-4xl font-bold text-gray-800">{total}</div>
            <div className="text-sm text-gray-500">Deputados</div>
          </div>
        </div>

        <PartyLegend
          partyComposition={party_composition}
          total={total}
          selectedParty={selectedParty}
          onPartyClick={setSelectedParty}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={Object.keys(party_composition).length} label="Partidos" />
        <StatCard value={`${femalePercentage}%`} label="Mulheres" />
        <StatCard value={circulos.length} label="Circulos" />
      </div>

      {/* Deputies Section */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Deputados{selectedParty ? ` - ${selectedParty}` : ''}
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Pesquisar deputado..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />

        <select
          value={selectedCirculo}
          onChange={(e) => setSelectedCirculo(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          <option value="">Todos os circulos</option>
          {circulos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          <option value="">Genero</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </div>

      {/* Deputies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDeputados.map((dep) => (
          <DeputyCard key={dep.dep_id} deputy={dep} />
        ))}
      </div>

      {filteredDeputados.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum deputado encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  )
}
