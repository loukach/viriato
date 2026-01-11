import { Hemicycle } from './Hemicycle'
import type { Committee } from '../lib/api'

interface CommitteeCardProps {
  committee: Committee
  onClick: () => void
}

export function CommitteeCard({ committee, onClick }: CommitteeCardProps) {
  // Shorten the committee name
  const shortName = committee.name
    .replace('Comissao de ', '')
    .replace('Comissao Parlamentar de Inquerito', 'Inquerito:')
    .replace('Comissao ', '')

  return (
    <article
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">{shortName}</h3>

        {/* Initiative stats */}
        <div className="flex gap-1 flex-shrink-0">
          {committee.ini_authored > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" title="Autoria">
              A{committee.ini_authored}
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700" title="Em analise">
            E{committee.ini_in_progress}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700" title="Aprovadas">
            +{committee.ini_approved}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700" title="Rejeitadas">
            -{committee.ini_rejected}
          </span>
        </div>
      </div>

      {/* Total members */}
      <p className="text-xs text-gray-500 mb-3">{committee.total_members} membros</p>

      {/* Mini Hemicycle */}
      <div className="relative w-full aspect-[2/1] overflow-hidden">
        <Hemicycle
          partyComposition={committee.parties}
          total={committee.total_members}
          selectedParty={null}
          size="small"
        />
      </div>

      {/* Party counts */}
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(committee.parties)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([party, count]) => (
            <span key={party} className="text-xs text-gray-500">
              {party}:{count}
            </span>
          ))}
      </div>
    </article>
  )
}
