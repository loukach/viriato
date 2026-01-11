import { getPartyColor, sortPartiesBySpectrum } from '../lib/partyColors'

interface PartyLegendProps {
  partyComposition: Record<string, number>
  total: number
  selectedParty: string | null
  onPartyClick: (party: string | null) => void
}

export function PartyLegend({ partyComposition, total, selectedParty, onPartyClick }: PartyLegendProps) {
  const sortedParties = sortPartiesBySpectrum(Object.keys(partyComposition))

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {sortedParties.map((party) => {
        const count = partyComposition[party] || 0
        if (count === 0) return null

        const color = getPartyColor(party)
        const isActive = selectedParty === party

        return (
          <button
            key={party}
            onClick={() => onPartyClick(isActive ? null : party)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
              isActive
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-medium">{party}</span>
            <span className={isActive ? 'text-gray-300' : 'text-gray-400'}>{count}</span>
          </button>
        )
      })}

      {/* All option */}
      <button
        onClick={() => onPartyClick(null)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
          !selectedParty
            ? 'bg-gray-800 text-white shadow-md'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
        <span className="font-medium">Todos</span>
        <span className={!selectedParty ? 'text-gray-300' : 'text-gray-400'}>{total}</span>
      </button>
    </div>
  )
}
