import { useMemo } from 'react'
import { getTypeFullName, getTypeColor } from '../lib/typeLabels'
import type { Initiative } from '../lib/api'

interface TypeWidgetProps {
  initiatives: Initiative[]
}

export function TypeWidget({ initiatives }: TypeWidgetProps) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    initiatives.forEach((ini) => {
      const type = ini.IniTipo || 'Outro'
      counts[type] = (counts[type] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [initiatives])

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Por Tipo</h3>

      <div className="grid grid-cols-2 gap-3">
        {typeCounts.map(([type, count]) => {
          const name = getTypeFullName(type)
          const color = getTypeColor(type)

          return (
            <div
              key={type}
              className="rounded-lg p-4 text-white text-center"
              style={{ background: color }}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs opacity-90">{name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
