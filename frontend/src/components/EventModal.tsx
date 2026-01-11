import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'
import { StatusBadge } from './StatusBadge'
import { useAgendaInitiatives } from '../hooks/useAgenda'
import { getEventTypeConfig } from '../lib/eventTypes'
import { formatDateLong } from '../lib/formatDate'
import type { AgendaEvent } from '../lib/api'

interface EventModalProps {
  event: AgendaEvent | null
  onClose: () => void
}

export function EventModal({ event, onClose }: EventModalProps) {
  const { data, isLoading } = useAgendaInitiatives(event?.event_id || null)

  if (!event) return null

  const typeConfig = getEventTypeConfig(event.event_type)

  return (
    <Modal isOpen={!!event} onClose={onClose} title={event.title}>
      <div className="space-y-4">
        {/* Event info */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: typeConfig.color }}
          >
            {typeConfig.label}
          </span>
          <span className="text-gray-600">{formatDateLong(event.start_date)}</span>
          {event.room && <span className="text-gray-500">📍 {event.room}</span>}
        </div>

        {/* Subtitle */}
        {event.subtitle && <p className="text-gray-700">{event.subtitle}</p>}

        {/* Description */}
        {isLoading ? (
          <LoadingSpinner message="A carregar detalhes..." />
        ) : data?.description ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Descricao</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.description}</p>
          </div>
        ) : null}

        {/* Linked Initiatives */}
        {!isLoading && data?.initiatives && data.initiatives.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Iniciativas Relacionadas ({data.initiatives.length})
            </h4>
            <div className="space-y-3">
              {data.initiatives.map((ini) => (
                <div key={ini.ini_id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {ini.type_description}
                    </span>
                    <span className="text-xs text-gray-400">ID: {ini.ini_id}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-2">{ini.title}</p>
                  <div className="flex items-center gap-3">
                    {ini.author && (
                      <span className="text-xs text-gray-500">Autor: {ini.author}</span>
                    )}
                    <StatusBadge status={ini.status} inline />
                  </div>
                  {ini.text_link && (
                    <a
                      href={ini.text_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-[var(--primary)] hover:underline"
                    >
                      Ver detalhes completos →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (!data?.initiatives || data.initiatives.length === 0) && !data?.description && (
          <p className="text-gray-500 text-center py-4">Sem informacao adicional.</p>
        )}
      </div>
    </Modal>
  )
}
