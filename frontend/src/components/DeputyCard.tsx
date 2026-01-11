import { useState } from 'react'
import { getPartyColor } from '../lib/partyColors'
import type { Deputy } from '../lib/api'

interface DeputyCardProps {
  deputy: Deputy
}

export function DeputyCard({ deputy }: DeputyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const color = getPartyColor(deputy.party)
  const initials = deputy.name
    .split(' ')
    .filter((n) => n.length > 2)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const genderIcon = deputy.gender === 'F' ? '♀️' : deputy.gender === 'M' ? '♂️' : ''
  const ageDisplay = deputy.age ? `${deputy.age} anos` : ''

  // Counts
  const comissoesCount = deputy.comissoes?.length || 0
  const gruposCount = deputy.grupos_trabalho?.length || 0

  // Get roles in comissões (Presidente, Vice-Presidente, etc.)
  const leadershipRoles = deputy.comissoes?.filter((c) => c.role && c.role !== 'Membro') || []

  return (
    <article
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
        isExpanded ? 'ring-2 ring-[var(--primary)]' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }
      }}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      aria-label={deputy.name}
    >
      <div className="p-4">
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

        {/* Profession */}
        {deputy.profession && (
          <div className="text-sm text-gray-600 mb-3 line-clamp-2" title={deputy.profession}>
            <span className="text-gray-400">💼</span> {deputy.profession}
          </div>
        )}

        {/* Substitute info */}
        {deputy.situation === 'Efetivo Temporario' && deputy.replaces && (
          <div className="text-xs text-gray-500 mb-3">
            <span>↔️</span> Substitui:{' '}
            {Array.isArray(deputy.replaces) ? deputy.replaces.join(', ') : deputy.replaces}
          </div>
        )}

        {/* Orgãos counts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {comissoesCount > 0 && (
            <span
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700"
              title={`${comissoesCount} comissões parlamentares`}
            >
              🏛️ {comissoesCount} {comissoesCount === 1 ? 'Comissão' : 'Comissões'}
            </span>
          )}
          {gruposCount > 0 && (
            <span
              className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700"
              title={`${gruposCount} grupos de trabalho`}
            >
              👥 {gruposCount} {gruposCount === 1 ? 'Grupo' : 'Grupos'} de Trabalho
            </span>
          )}
        </div>

        {/* Leadership roles preview */}
        {leadershipRoles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {leadershipRoles.slice(0, 2).map((c, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded bg-[var(--primary)] text-white"
                title={`${c.name} - ${c.role}`}
              >
                {c.role}
              </span>
            ))}
            {leadershipRoles.length > 2 && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                +{leadershipRoles.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Expand indicator */}
        <div className="flex items-center justify-center gap-2 mt-3 text-gray-400 text-sm">
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
          <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          {/* Full name */}
          {deputy.full_name && deputy.full_name !== deputy.name && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Nome Completo</h4>
              <p className="text-sm text-gray-600">{deputy.full_name}</p>
            </div>
          )}

          {/* Education */}
          {deputy.education && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Habilitações</h4>
              <p className="text-sm text-gray-600">{deputy.education}</p>
            </div>
          )}

          {/* Full profession if truncated */}
          {deputy.profession && deputy.profession.length > 60 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Profissão</h4>
              <p className="text-sm text-gray-600">{deputy.profession}</p>
            </div>
          )}

          {/* Comissões list */}
          {comissoesCount > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Comissões Parlamentares ({comissoesCount})
              </h4>
              <div className="space-y-2">
                {deputy.comissoes.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        c.role && c.role !== 'Membro' ? 'bg-[var(--primary)]' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800">{c.name}</div>
                      {c.role && c.role !== 'Membro' && (
                        <div className="text-xs text-[var(--primary)] font-medium">{c.role}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grupos de Trabalho list */}
          {gruposCount > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Grupos de Trabalho ({gruposCount})
              </h4>
              <div className="space-y-2">
                {deputy.grupos_trabalho.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        g.role && g.role !== 'Membro' ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800">{g.name}</div>
                      {g.role && g.role !== 'Membro' && (
                        <div className="text-xs text-purple-600 font-medium">{g.role}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No memberships */}
          {comissoesCount === 0 && gruposCount === 0 && (
            <p className="text-sm text-gray-500">Sem participação em comissões ou grupos de trabalho.</p>
          )}

          {/* Link to Parliament */}
          <a
            href={`https://www.parlamento.pt/DeputadoGP/Paginas/Biografia.aspx?BID=${deputy.dep_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver no Parlamento.pt →
          </a>
        </div>
      )}
    </article>
  )
}
