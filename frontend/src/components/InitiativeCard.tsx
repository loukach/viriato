import { useState } from 'react'
import { TypeBadge } from './TypeBadge'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '../lib/formatDate'
import type { Initiative } from '../lib/api'

interface InitiativeCardProps {
  initiative: Initiative
}

export function InitiativeCard({ initiative }: InitiativeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const events = initiative.IniEventos || []
  const status = initiative._currentStatus || 'Desconhecido'

  // Sort events by date for timeline
  const sortedEvents = [...events].sort((a, b) =>
    (a.DataFase || '').localeCompare(b.DataFase || '')
  )

  // Get the initiative entry date (first event, typically "Entrada")
  const entryDate = sortedEvents.length > 0 ? sortedEvents[0].DataFase : null

  // Get authors (parties and/or government/other)
  const getAuthors = (): string[] => {
    const authors: string[] = []

    // Check for Government or other special authors
    if (initiative.IniAutorOutros?.nome === 'Governo') {
      authors.push('Governo')
    }

    // Check for parliamentary groups (parties)
    if (initiative.IniAutorGruposParlamentares) {
      const groups = Array.isArray(initiative.IniAutorGruposParlamentares)
        ? initiative.IniAutorGruposParlamentares
        : [initiative.IniAutorGruposParlamentares]

      groups.forEach((g) => {
        if (g.GP && !authors.includes(g.GP)) {
          authors.push(g.GP)
        }
      })
    }

    // If no specific author found, show "Outros"
    if (authors.length === 0 && initiative.IniAutorOutros?.nome) {
      authors.push(initiative.IniAutorOutros.nome)
    }

    return authors
  }

  const authors = getAuthors()

  return (
    <article
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
        isExpanded ? 'ring-2 ring-[var(--primary)]' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }
      }}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      aria-label={initiative.IniTitulo}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <TypeBadge typeCode={initiative.IniTipo} typeDesc={initiative.IniDescTipo} />
          <span className="text-sm text-gray-500">
            {initiative.IniNr}/{initiative.IniTipo}
          </span>
        </div>

        {/* Title - expands when card is expanded */}
        <h3 className={`font-semibold text-gray-800 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
          {initiative.IniTitulo}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          {entryDate && <span>📅 {formatDate(entryDate)}</span>}
          <span>📊 {events.length} fases</span>
        </div>

        {/* Status */}
        <StatusBadge status={status} />

        {/* Expand indicator */}
        <div className="flex items-center justify-center gap-2 mt-3 text-gray-400 text-sm">
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
          <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
        </div>
      </div>

      {/* Expanded content - Summary, Authors and Timeline */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          {/* Summary */}
          {initiative._summary && !initiative._summary.startsWith('[Extracao nao disponivel]') && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Resumo</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {initiative._summary}
              </p>
            </div>
          )}

          {/* Authors */}
          {authors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Autores</h4>
              <div className="flex flex-wrap gap-2">
                {authors.map((author) => (
                  <span
                    key={author}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                  >
                    {author}
                  </span>
                ))}
              </div>
            </div>
          )}

          <h4 className="text-sm font-semibold text-gray-700 mb-3">Ciclo de Vida</h4>

          {sortedEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Sem eventos registados.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

              {/* Events */}
              <div className="space-y-3">
                {sortedEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {/* Dot */}
                    <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{event.Fase}</div>
                      <div className="text-xs text-gray-500">{formatDate(event.DataFase)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to Parliament */}
          <a
            href={`https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=${initiative.IniId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver no Parlamento.pt →
          </a>
        </div>
      )}
    </article>
  )
}
