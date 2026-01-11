import { getPartyColor } from '../lib/partyColors'
import type { Deputy } from '../lib/api'

interface DeputyCardProps {
  deputy: Deputy
}

export function DeputyCard({ deputy }: DeputyCardProps) {
  const color = getPartyColor(deputy.party)
  const initials = deputy.name
    .split(' ')
    .filter((n) => n.length > 2)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const genderIcon = deputy.gender === 'F' ? '♀️' : deputy.gender === 'M' ? '♂️' : ''
  const ageDisplay = deputy.age ? `${deputy.age} anos` : ''

  // Build commissions display
  const hasCommissions = deputy.comissoes && deputy.comissoes.length > 0

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      {/* Header with avatar and info */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-800 truncate">{deputy.name}</div>
          <div className="text-sm font-medium" style={{ color }}>
            {deputy.party || 'Sem partido'}
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <span>📍</span> {deputy.circulo || 'N/A'}
        </span>
        {genderIcon && (
          <span className="flex items-center gap-1">
            <span>{genderIcon}</span>
          </span>
        )}
        {ageDisplay && <span>{ageDisplay}</span>}
      </div>

      {/* Substitute info */}
      {deputy.situation === 'Efetivo Temporario' && deputy.replaces && (
        <div className="text-xs text-gray-500 mb-3">
          <span>↔️</span> Substitui:{' '}
          {Array.isArray(deputy.replaces) ? deputy.replaces.join(', ') : deputy.replaces}
        </div>
      )}

      {/* Commissions */}
      {hasCommissions && (
        <div className="flex flex-wrap gap-1">
          {deputy.comissoes.slice(0, 3).map((c, i) => {
            const hasRole = c.role && c.role !== 'Membro'
            return (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded ${
                  hasRole
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
                title={`${c.name}${hasRole ? ' - ' + c.role : ''}`}
              >
                {c.acronym || c.name.substring(0, 20)}
              </span>
            )
          })}
          {deputy.comissoes.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              +{deputy.comissoes.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
