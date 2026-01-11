import { useMemo } from 'react'
import { getPartyColor } from '../lib/partyColors'
import type { Initiative } from '../lib/api'

interface AuthorWidgetProps {
  initiatives: Initiative[]
  selectedAuthors?: string[]
  onToggleAuthor?: (author: string) => void
}

export function AuthorWidget({ initiatives, selectedAuthors = [], onToggleAuthor }: AuthorWidgetProps) {
  const authors = useMemo(() => {
    // Count government initiatives
    let governmentCount = 0
    let outrosCount = 0
    const partyCounts: Record<string, number> = {}

    initiatives.forEach((ini) => {
      let hasAuthor = false

      if (ini.IniAutorOutros?.nome === 'Governo') {
        governmentCount++
        hasAuthor = true
      }

      if (ini.IniAutorGruposParlamentares) {
        const groups = Array.isArray(ini.IniAutorGruposParlamentares)
          ? ini.IniAutorGruposParlamentares
          : [ini.IniAutorGruposParlamentares]

        groups.forEach((g) => {
          if (g.GP) {
            partyCounts[g.GP] = (partyCounts[g.GP] || 0) + 1
            hasAuthor = true
          }
        })
      }

      // Count "Outros" for initiatives without Government or party authors
      if (!hasAuthor) {
        outrosCount++
      }
    })

    // Build combined list: Government first, then all parties sorted by count, then Outros
    const result: { name: string; count: number; isGovernment: boolean; isOutros: boolean }[] = []

    if (governmentCount > 0) {
      result.push({ name: 'Governo', count: governmentCount, isGovernment: true, isOutros: false })
    }

    Object.entries(partyCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([party, count]) => {
        result.push({ name: party, count, isGovernment: false, isOutros: false })
      })

    if (outrosCount > 0) {
      result.push({ name: 'Outros', count: outrosCount, isGovernment: false, isOutros: true })
    }

    return result
  }, [initiatives])

  const maxCount = Math.max(...authors.map((a) => a.count), 1)
  const hasSelection = selectedAuthors.length > 0

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Por Autor</h3>

      <div className="space-y-2">
        {authors.map(({ name, count, isGovernment, isOutros }) => {
          const widthPercent = (count / maxCount) * 100
          const color = isGovernment || isOutros ? '#6b7280' : getPartyColor(name)
          const isSelected = selectedAuthors.includes(name)
          const dimmed = hasSelection && !isSelected

          return (
            <div
              key={name}
              onClick={() => onToggleAuthor?.(name)}
              className={`flex items-center gap-2 transition-all ${
                onToggleAuthor ? 'cursor-pointer hover:bg-gray-50 rounded -mx-1 px-1' : ''
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              <span className="text-sm text-gray-700 w-20 truncate">{name}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded flex items-center justify-end px-2 transition-all ${
                    isSelected ? 'ring-2 ring-inset ring-gray-800' : ''
                  }`}
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
