import { useMemo } from 'react'
import { getPartyColor } from '../lib/partyColors'
import type { Initiative } from '../lib/api'

interface AuthorWidgetProps {
  initiatives: Initiative[]
}

export function AuthorWidget({ initiatives }: AuthorWidgetProps) {
  const authors = useMemo(() => {
    // Count government initiatives
    let governmentCount = 0
    const partyCounts: Record<string, number> = {}

    initiatives.forEach((ini) => {
      if (ini.IniAutorOutros?.nome === 'Governo') {
        governmentCount++
      }

      if (ini.IniAutorGruposParlamentares) {
        const groups = Array.isArray(ini.IniAutorGruposParlamentares)
          ? ini.IniAutorGruposParlamentares
          : [ini.IniAutorGruposParlamentares]

        groups.forEach((g) => {
          if (g.GP) {
            partyCounts[g.GP] = (partyCounts[g.GP] || 0) + 1
          }
        })
      }
    })

    // Build combined list: Government first, then parties
    const result: { name: string; count: number; isGovernment: boolean }[] = []

    if (governmentCount > 0) {
      result.push({ name: 'Governo', count: governmentCount, isGovernment: true })
    }

    Object.entries(partyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([party, count]) => {
        result.push({ name: party, count, isGovernment: false })
      })

    return result
  }, [initiatives])

  const maxCount = Math.max(...authors.map((a) => a.count), 1)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Por Autor</h3>

      <div className="space-y-2">
        {authors.map(({ name, count, isGovernment }) => {
          const widthPercent = (count / maxCount) * 100
          const color = isGovernment ? '#6b7280' : getPartyColor(name)

          return (
            <div key={name} className="flex items-center gap-2">
              <span className="text-sm text-gray-700 w-20 truncate">{name}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded flex items-center justify-end px-2"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color,
                  }}
                >
                  <span className="text-xs font-medium text-white">{count}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
