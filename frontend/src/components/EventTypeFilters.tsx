import { EVENT_TYPES, type EventType } from '../lib/eventTypes'

interface EventTypeFiltersProps {
  activeTypes: Set<EventType>
  onToggle: (type: EventType) => void
}

export function EventTypeFilters({ activeTypes, onToggle }: EventTypeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EVENT_TYPES.map(({ key, label, color }) => {
        const isActive = activeTypes.has(key)

        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
              isActive ? 'opacity-100' : 'opacity-40'
            }`}
            style={{
              backgroundColor: isActive ? color : '#e5e7eb',
              color: isActive ? 'white' : '#6b7280',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isActive ? 'white' : color }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
