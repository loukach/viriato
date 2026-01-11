import { useState } from 'react'
import { useCommittees } from '../hooks/useCommittees'
import { CommitteeCard } from '../components/CommitteeCard'
import { CommitteeModal } from '../components/CommitteeModal'
import { PartyLegend } from '../components/PartyLegend'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import type { Committee } from '../lib/api'

export function ComissoesPage() {
  const { data: committees, isLoading, isError, refetch } = useCommittees()
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null)

  if (isLoading) {
    return <LoadingSpinner message="A carregar comissoes..." />
  }

  if (isError) {
    return <ErrorState title="Erro ao carregar comissoes" onRetry={() => refetch()} />
  }

  // Build aggregated party composition for legend
  const allParties: Record<string, number> = {}
  committees?.forEach((c) => {
    Object.entries(c.parties).forEach(([party, count]) => {
      allParties[party] = (allParties[party] || 0) + count
    })
  })

  // Total members across all committees (for legend display only)
  const totalMembers = Object.values(allParties).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Comissoes Parlamentares</h1>
        <p className="text-gray-600">{committees?.length || 0} comissoes</p>
      </div>

      {/* Party Legend */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Partidos</h3>
        <PartyLegend
          partyComposition={allParties}
          total={totalMembers}
          selectedParty={null}
          onPartyClick={() => {}}
        />
      </div>

      {/* Committee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {committees?.map((committee) => (
          <CommitteeCard
            key={committee.org_id}
            committee={committee}
            onClick={() => setSelectedCommittee(committee)}
          />
        ))}
      </div>

      {committees?.length === 0 && (
        <div className="text-center py-12 text-gray-500">Nenhuma comissao encontrada.</div>
      )}

      {/* Committee Modal */}
      <CommitteeModal
        committee={selectedCommittee}
        onClose={() => setSelectedCommittee(null)}
      />
    </div>
  )
}
