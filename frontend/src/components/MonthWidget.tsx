import { useMemo } from 'react'
import { getMonthKey, getMonthName } from '../lib/formatDate'
import type { Initiative } from '../lib/api'

interface MonthWidgetProps {
  initiatives: Initiative[]
  selectedMonths?: string[]
  onToggleMonth?: (month: string) => void
}

export function MonthWidget({ initiatives, selectedMonths = [], onToggleMonth }: MonthWidgetProps) {
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    initiatives.forEach((ini) => {
      const events = ini.IniEventos || []
      if (events.length > 0) {
        // Sort events and get the first one (Entrada)
        const sortedEvents = [...events].sort((a, b) =>
          (a.DataFase || '').localeCompare(b.DataFase || '')
        )
        const firstDate = sortedEvents[0].DataFase
        if (firstDate) {
          const monthKey = getMonthKey(firstDate)
          counts[monthKey] = (counts[monthKey] || 0) + 1
        }
      }
    })

    return counts
  }, [initiatives])

  const sortedMonths = Object.keys(monthCounts).sort()
  const maxCount = Math.max(...Object.values(monthCounts), 1)
  const hasSelection = selectedMonths.length > 0

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Por Mes</h3>

      <div className="flex items-end gap-1" style={{ height: '128px' }}>
        {sortedMonths.map((monthKey) => {
          const count = monthCounts[monthKey]
          const heightPercent = (count / maxCount) * 100
          const [year, month] = monthKey.split('-')
          const monthName = getMonthName(parseInt(month))
          const isSelected = selectedMonths.includes(monthKey)
          const dimmed = hasSelection && !isSelected

          return (
            <div
              key={monthKey}
              onClick={() => onToggleMonth?.(monthKey)}
              className={`flex-1 flex flex-col items-center h-full transition-all ${
                onToggleMonth ? 'cursor-pointer hover:bg-gray-50 rounded' : ''
              } ${dimmed ? 'opacity-40' : ''}`}
              title={`${count} iniciativas em ${monthName} ${year}`}
            >
              {/* Bar container with explicit height for percentage to work */}
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full bg-[var(--primary)] rounded-t-sm min-h-[4px] transition-all ${
                    isSelected ? 'ring-2 ring-gray-800' : ''
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 truncate w-full text-center flex-shrink-0">
                {monthName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
