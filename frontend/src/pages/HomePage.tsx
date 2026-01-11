import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Viriato</h1>
        <p className="text-xl opacity-90 mb-2">Dados Abertos do Parlamento Portugues</p>
        <p className="text-white/70 max-w-2xl mx-auto">
          Visualizacao da atividade legislativa da XVII Legislatura (2025-presente).
          Explore a agenda parlamentar e as iniciativas legislativas.
        </p>
      </section>

      {/* Viewer Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewerCard
            to="/assembleia"
            title="A Assembleia"
            description="Explore os deputados por partido, circulo eleitoral, genero e comissoes."
            stats={[
              { value: '230', label: 'Deputados' },
              { value: '22', label: 'Circulos' },
            ]}
          />
          <ViewerCard
            to="/iniciativas"
            title="Iniciativas Legislativas"
            description="Explore as iniciativas legislativas ao longo de todas as fases do processo parlamentar."
            stats={[
              { value: '808', label: 'Iniciativas' },
              { value: '102', label: 'Concluidas' },
            ]}
          />
          <ViewerCard
            to="/agenda"
            title="Agenda Parlamentar"
            description="Consulte o calendario parlamentar com sessoes plenarias, reunioes de comissoes e outros eventos."
            stats={[
              { value: '34', label: 'Eventos' },
              { value: 'Jan 2026', label: 'Atual' },
            ]}
          />
          <ViewerCard
            to="/comissoes"
            title="Comissoes Parlamentares"
            description="Consulte a composicao partidaria e o trabalho das comissoes parlamentares."
            stats={[
              { value: '18', label: 'Comissoes' },
              { value: 'XVII', label: 'Legislatura' },
            ]}
          />
        </div>
      </section>
    </div>
  )
}

interface ViewerCardProps {
  to: string
  title: string
  description: string
  stats: { value: string; label: string }[]
}

function ViewerCard({ to, title, description, stats }: ViewerCardProps) {
  return (
    <Link
      to={to}
      className="block bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 p-6"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="flex gap-6 pt-4 border-t border-gray-100">
        {stats.map((stat, i) => (
          <div key={i}>
            <div className="text-2xl font-bold text-[var(--primary)]">{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>
    </Link>
  )
}
