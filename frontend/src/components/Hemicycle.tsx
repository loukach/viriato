import { getPartyColor, sortPartiesBySpectrum } from '../lib/partyColors'

interface HemicycleProps {
  partyComposition: Record<string, number>
  total: number
  selectedParty: string | null
  onPartyClick?: (party: string | null) => void
  size?: 'small' | 'large'
}

/**
 * Create SVG arc path for hemicycle segment
 */
function createArcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number
): string {
  const startAngleRad = ((startAngle - 90) * Math.PI) / 180
  const endAngleRad = ((endAngle - 90) * Math.PI) / 180

  const x1 = cx + outerRadius * Math.cos(startAngleRad)
  const y1 = cy + outerRadius * Math.sin(startAngleRad)
  const x2 = cx + outerRadius * Math.cos(endAngleRad)
  const y2 = cy + outerRadius * Math.sin(endAngleRad)
  const x3 = cx + innerRadius * Math.cos(endAngleRad)
  const y3 = cy + innerRadius * Math.sin(endAngleRad)
  const x4 = cx + innerRadius * Math.cos(startAngleRad)
  const y4 = cy + innerRadius * Math.sin(startAngleRad)

  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
}

export function Hemicycle({
  partyComposition,
  total,
  selectedParty,
  onPartyClick,
  size = 'large',
}: HemicycleProps) {
  const isLarge = size === 'large'
  const cx = isLarge ? 200 : 100
  const cy = isLarge ? 190 : 95
  const outerRadius = isLarge ? 180 : 90
  const innerRadius = isLarge ? 70 : 35
  const viewBox = isLarge ? '0 0 400 200' : '0 0 200 100'

  // Sort parties by political spectrum
  const sortedParties = sortPartiesBySpectrum(Object.keys(partyComposition))

  // Build segments
  let currentAngle = -90
  const segments = sortedParties
    .filter((party) => partyComposition[party] > 0)
    .map((party) => {
      const count = partyComposition[party]
      const sweepAngle = (count / total) * 180
      const endAngle = currentAngle + sweepAngle
      const color = getPartyColor(party)
      const path = createArcPath(currentAngle, endAngle, innerRadius, outerRadius, cx, cy)
      const isActive = selectedParty === party

      const segment = {
        party,
        count,
        color,
        path,
        isActive,
      }

      currentAngle = endAngle
      return segment
    })

  return (
    <svg className="w-full" viewBox={viewBox} preserveAspectRatio="xMidYMax meet">
      {segments.map(({ party, count, color, path, isActive }) => (
        <path
          key={party}
          d={path}
          fill={color}
          stroke="white"
          strokeWidth={isLarge ? 1 : 0.5}
          opacity={selectedParty && !isActive ? 0.4 : 1}
          className={onPartyClick ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}
          onClick={() => onPartyClick?.(party)}
        >
          <title>
            {party}: {count} deputados
          </title>
        </path>
      ))}
    </svg>
  )
}
