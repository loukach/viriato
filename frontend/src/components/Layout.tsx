import { Outlet, NavLink } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <NavLink to="/" className="text-white font-bold text-xl">
            Viriato
          </NavLink>

          <div className="flex items-center gap-1">
            <NavLink
              to="/assembleia"
              className={({ isActive }) =>
                `px-3 py-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-white' : ''}`
              }
            >
              A Assembleia
            </NavLink>
            <NavLink
              to="/iniciativas"
              className={({ isActive }) =>
                `px-3 py-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-white' : ''}`
              }
            >
              Iniciativas
            </NavLink>
            <NavLink
              to="/agenda"
              className={({ isActive }) =>
                `px-3 py-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-white' : ''}`
              }
            >
              Agenda
            </NavLink>
            <NavLink
              to="/comissoes"
              className={({ isActive }) =>
                `px-3 py-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-white' : ''}`
              }
            >
              Comissoes
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-4 text-center text-sm text-gray-600">
        <p>
          Fonte de dados: <a href="https://www.parlamento.pt" className="text-[var(--primary)] hover:underline">Parlamento.pt</a>
          {' | '}
          XVII Legislatura (2025-presente)
        </p>
      </footer>
    </div>
  )
}
