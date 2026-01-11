import { useMemo } from 'react'
import { getStatusCategory, getStatusCategoriesInOrder, type StatusCategory } from '../lib/statusCategories'
import type { Initiative } from '../lib/api'

interface LifecycleFunnelProps {
  initiatives: Initiative[]
  title: string
}

export function LifecycleFunnel({ initiatives, title }: LifecycleFunnelProps) {
  // Compute counts by status category
  const phaseCounts = useMemo(() => {
    const counts: Record<StatusCategory, number> = {
      submitted: 0,
      announced: 0,
      discussion: 0,
      voting: 0,
      finalizing: 0,
      approved: 0,
      rejected: 0,
    }

    initiatives.forEach((ini) => {
      const status = ini._currentStatus || 'Desconhecido'
      const { category } = getStatusCategory(status)
      counts[category]++
    })

    return counts
  }, [initiatives])

  const categories = getStatusCategoriesInOrder()
  const maxCount = Math.max(...Object.values(phaseCounts), 1)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>

      <div className="flex items-end justify-between gap-2 h-48">
        {categories.map(({ category, label, color }) => {
          const count = phaseCounts[category]
          const heightPercent = (count / maxCount) * 100
          const minHeight = count > 0 ? Math.max(heightPercent, 10) : 5

          return (
            <div key={category} className="flex-1 flex flex-col items-center">
              {/* Bar */}
              <div className="w-full flex flex-col items-center justify-end h-40">
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${minHeight}%`,
                    backgroundColor: color,
                  }}
                />
              </div>

              {/* Count */}
              <div className="text-sm font-bold text-gray-800 mt-2">{count}</div>

              {/* Label */}
              <div className="text-xs text-gray-500 text-center mt-1 leading-tight">
                {label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
