interface FilterPillsProps {
  filters: {
    types: string[]
    authors: string[]
    months: string[]
    phases: string[]
  }
  onRemove: (category: 'types' | 'authors' | 'months' | 'phases', value: string) => void
  onClearAll: () => void
}

// Category display names and colors
const CATEGORY_CONFIG = {
  types: { label: 'Tipo', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  authors: { label: 'Autor', color: 'bg-green-100 text-green-800 border-green-200' },
  months: { label: 'Mes', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  phases: { label: 'Fase', color: 'bg-orange-100 text-orange-800 border-orange-200' },
}

// Type code to readable label
const TYPE_LABELS: Record<string, string> = {
  J: 'Proj. Lei',
  P: 'Prop. Lei',
  R: 'Proj. Res.',
  S: 'Prop. Res.',
  D: 'Deliberacao',
  I: 'Inquerito',
  A: 'Apreciacao',
}

// Phase to readable label
const PHASE_LABELS: Record<string, string> = {
  submitted: 'Submetida',
  announced: 'Anunciada',
  discussion: 'Em discussao',
  voting: 'Em votacao',
  finalizing: 'A finalizar',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
}

// Month key to readable label
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${monthNames[parseInt(month) - 1]} ${year}`
}

export function FilterPills({ filters, onRemove, onClearAll }: FilterPillsProps) {
  const hasFilters =
    filters.types.length > 0 ||
    filters.authors.length > 0 ||
    filters.months.length > 0 ||
    filters.phases.length > 0

  if (!hasFilters) {
    return (
      <div className="text-sm text-gray-400 italic">
        Clique nos widgets acima para filtrar
      </div>
    )
  }

  const renderPills = (
    category: 'types' | 'authors' | 'months' | 'phases',
    values: string[]
  ) => {
    const config = CATEGORY_CONFIG[category]

    return values.map((value) => {
      let displayValue = value
      if (category === 'types') {
        displayValue = TYPE_LABELS[value] || value
      } else if (category === 'phases') {
        displayValue = PHASE_LABELS[value] || value
      } else if (category === 'months') {
        displayValue = formatMonth(value)
      }

      return (
        <span
          key={`${category}-${value}`}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border ${config.color}`}
        >
          <span className="font-medium">{config.label}:</span>
          <span>{displayValue}</span>
          <button
            onClick={() => onRemove(category, value)}
            className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
            aria-label={`Remover filtro ${displayValue}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {renderPills('types', filters.types)}
      {renderPills('authors', filters.authors)}
      {renderPills('months', filters.months)}
      {renderPills('phases', filters.phases)}

      <button
        onClick={onClearAll}
        className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
      >
        Limpar filtros
      </button>
    </div>
  )
}
