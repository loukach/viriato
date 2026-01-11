import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'
import { StatusBadge } from './StatusBadge'
import { useCommitteeDetails } from '../hooks/useCommittees'
import { getStatusCategory, getStatusCategoriesInOrder } from '../lib/statusCategories'
import { formatDateShort } from '../lib/formatDate'
import type { Committee } from '../lib/api'

interface CommitteeModalProps {
  committee: Committee | null
  onClose: () => void
}

export function CommitteeModal({ committee, onClose }: CommitteeModalProps) {
  const { data, isLoading } = useCommitteeDetails(committee?.org_id || null)

  if (!committee) return null

  // Compute status counts for lead initiatives
  const statusCounts: Record<string, number> = {}
  const leadInitiatives = data?.initiatives?.filter((i) => i.link_type === 'lead') || []
  const secondaryInitiatives = data?.initiatives?.filter((i) => i.link_type === 'secondary') || []

  leadInitiatives.forEach((item) => {
    const { category } = getStatusCategory(item.initiative.current_status || '')
    statusCounts[category] = (statusCounts[category] || 0) + 1
  })

  const categories = getStatusCategoriesInOrder()
  const maxCount = Math.max(...Object.values(statusCounts), 1)

  return (
    <Modal isOpen={!!committee} onClose={onClose} title={committee.name}>
      {isLoading ? (
        <LoadingSpinner message="A carregar dados..." />
      ) : (
        <div className="space-y-6">
          {/* Status Chart */}
          {leadInitiatives.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Iniciativas em Analise ({data?.initiatives?.length || 0})
              </h4>

              <div className="flex items-end justify-between gap-2 h-24 mb-4">
                {categories.map(({ category, label, color }) => {
                  const count = statusCounts[category] || 0
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0
                  const minHeight = count > 0 ? Math.max(heightPercent, 15) : 5

                  return (
                    <div key={category} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-16">
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${minHeight}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <div className="text-xs font-bold text-gray-700 mt-1">{count}</div>
                      <div className="text-[10px] text-gray-500 text-center leading-tight">
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lead Initiatives (Competente) */}
          {leadInitiatives.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Competente</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {leadInitiatives.map((item) => {
                  const ini = item.initiative
                  return (
                    <a
                      key={ini.ini_id}
                      href={`https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${ini.ini_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          {ini.type_description} {ini.number || ''}/XVII
                        </span>
                        <span className="text-xs text-[var(--primary)]">Competente</span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">{ini.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {ini.author_name && (
                          <span className="text-xs text-gray-500">{ini.author_name}</span>
                        )}
                        <StatusBadge status={ini.current_status || ''} inline />
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Secondary Initiatives (Parecer) */}
          {secondaryInitiatives.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Parecer</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {secondaryInitiatives.map((item) => {
                  const ini = item.initiative
                  return (
                    <a
                      key={ini.ini_id}
                      href={`https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${ini.ini_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                          {ini.type_description}
                        </span>
                        <span className="text-xs text-gray-400">Parecer</span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-1">{ini.title}</p>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming Meetings */}
          {data?.agenda_events && data.agenda_events.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Proximas Reunioes ({data.agenda_events.length})
              </h4>
              <div className="space-y-2">
                {data.agenda_events.map((event, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-800">
                      {formatDateShort(event.start_date)}
                      {event.room && ` - ${event.room}`}
                    </div>
                    <p className="text-xs text-gray-600">{event.subtitle || `Reuniao`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!data?.initiatives?.length && !data?.agenda_events?.length && (
            <p className="text-gray-500 text-center py-4">
              Sem iniciativas ou reunioes registadas.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
