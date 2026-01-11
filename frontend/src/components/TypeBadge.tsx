import { getTypeLabel } from '../lib/typeLabels'

interface TypeBadgeProps {
  typeCode: string
  typeDesc?: string
}

const TYPE_CLASSES: Record<string, string> = {
  J: 'bg-blue-100 text-blue-700',
  P: 'bg-purple-100 text-purple-700',
  R: 'bg-green-100 text-green-700',
  S: 'bg-emerald-100 text-emerald-700',
  D: 'bg-orange-100 text-orange-700',
  I: 'bg-cyan-100 text-cyan-700',
  A: 'bg-amber-100 text-amber-700',
}

export function TypeBadge({ typeCode, typeDesc }: TypeBadgeProps) {
  const label = getTypeLabel(typeCode)
  const colorClass = TYPE_CLASSES[typeCode] || 'bg-gray-100 text-gray-700'

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
      aria-label={typeDesc ? `Tipo ${typeDesc}` : undefined}
    >
      {label}
    </span>
  )
}
