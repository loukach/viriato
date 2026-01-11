import { getEventTypeConfig } from '../lib/eventTypes'
import { formatDateWithWeekday } from '../lib/formatDate'
import type { AgendaEvent } from '../lib/api'

interface EventCardProps {
  event: AgendaEvent
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const typeConfig = getEventTypeConfig(event.event_type)

  return (
    <article
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* Color bar */}
      <div className="h-1" style={{ backgroundColor: typeConfig.color }} />

      <div className="p-4">
        {/* Type and date */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: typeConfig.color }}
          >
            {typeConfig.label}
          </span>
          <span className="text-sm text-gray-500">{formatDateWithWeekday(event.start_date)}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">{event.title}</h3>

        {/* Subtitle */}
        {event.subtitle && (
          <p className="text-sm text-gray-600 line-clamp-1">{event.subtitle}</p>
        )}

        {/* Room */}
        {event.room && (
          <p className="text-xs text-gray-400 mt-2">📍 {event.room}</p>
        )}
      </div>
    </article>
  )
}
