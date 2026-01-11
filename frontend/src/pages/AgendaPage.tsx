import { useState, useMemo } from 'react'
import { useAgenda } from '../hooks/useAgenda'
import { EventTypeFilters } from '../components/EventTypeFilters'
import { EventModal } from '../components/EventModal'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { EVENT_TYPES, getEventTypeKey, type EventType } from '../lib/eventTypes'
import { formatDateShort, isWeekend } from '../lib/formatDate'
import type { AgendaEvent } from '../lib/api'

export function AgendaPage() {
  const { data: events, isLoading, isError, refetch } = useAgenda()

  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(
    new Set(EVENT_TYPES.map((t) => t.key))
  )
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)

  // Toggle event type filter
  const toggleType = (type: EventType) => {
    const newTypes = new Set(activeTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setActiveTypes(newTypes)
  }

  // Filter events by active types
  const filteredEvents = useMemo(() => {
    if (!events) return []
    return events.filter((e) => activeTypes.has(getEventTypeKey(e.event_type)))
  }, [events, activeTypes])

  // Group events by date for timeline
  const eventsByDate = useMemo(() => {
    if (!filteredEvents.length) return []

    // Get date range
    const dates = filteredEvents.map((e) => new Date(e.start_date))
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

    // Build all dates in range
    const allDates: { date: string; events: AgendaEvent[]; isWeekend: boolean }[] = []
    const current = new Date(minDate)

    while (current <= maxDate) {
      const dateStr = current.toISOString().split('T')[0]
      const dayEvents = filteredEvents.filter(
        (e) => e.start_date.split('T')[0] === dateStr
      )
      allDates.push({
        date: dateStr,
        events: dayEvents,
        isWeekend: isWeekend(dateStr),
      })
      current.setDate(current.getDate() + 1)
    }

    return allDates
  }, [filteredEvents])

  if (isLoading) {
    return <LoadingSpinner message="A carregar agenda..." />
  }

  if (isError) {
    return <ErrorState title="Erro ao carregar agenda" onRetry={() => refetch()} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Agenda Parlamentar</h1>
        <p className="text-gray-600">{filteredEvents.length} eventos</p>
      </div>

      {/* Type filters */}
      <div className="mb-6">
        <EventTypeFilters activeTypes={activeTypes} onToggle={toggleType} />
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {eventsByDate.map(({ date, events: dayEvents, isWeekend: weekend }) => (
            <div
              key={date}
              className={`border-b last:border-b-0 ${
                weekend ? 'bg-gray-50 py-1' : 'py-3'
              }`}
            >
              {weekend ? (
                // Weekend: thin grey line
                <div className="px-4 text-xs text-gray-400">{formatDateShort(date)}</div>
              ) : (
                // Normal day
                <div className="px-4">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatDateShort(date)}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dayEvents.map((event) => {
                        const typeConfig = EVENT_TYPES.find(
                          (t) => t.key === getEventTypeKey(event.event_type)
                        )
                        return (
                          <button
                            key={event.event_id}
                            onClick={() => setSelectedEvent(event)}
                            className="px-3 py-1.5 rounded-lg text-sm text-white hover:opacity-80 transition-opacity text-left max-w-xs truncate"
                            style={{ backgroundColor: typeConfig?.color || '#6b7280' }}
                            title={event.title}
                          >
                            {event.title}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sem eventos</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {eventsByDate.length === 0 && (
            <div className="p-8 text-center text-gray-500">Nenhum evento encontrado.</div>
          )}
        </div>

      {/* Event Modal */}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
