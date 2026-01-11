import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { FeedbackModal } from './FeedbackModal'

// Nav icons matching the original vanilla JS version
const AssembleiaIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/>
    <line x1="6" y1="18" x2="6" y2="11"/>
    <line x1="10" y1="18" x2="10" y2="11"/>
    <line x1="14" y1="18" x2="14" y2="11"/>
    <line x1="18" y1="18" x2="18" y2="11"/>
    <polygon points="12 2 20 7 4 7"/>
  </svg>
)

const IniciativasIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

const AgendaIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ComissoesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const FeedbackIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M7.549 10.078c.46.182.88.424 1.258.725.378.3.701.65.97 1.046a4.829 4.829 0 0 1 .848 2.714V15H9.75v-.438a3.894 3.894 0 0 0-1.155-2.782 4.054 4.054 0 0 0-1.251-.84 3.898 3.898 0 0 0-1.532-.315A3.894 3.894 0 0 0 3.03 11.78a4.06 4.06 0 0 0-.84 1.251c-.206.474-.31.985-.315 1.531V15H1v-.438a4.724 4.724 0 0 1 .848-2.713 4.918 4.918 0 0 1 2.229-1.77 2.994 2.994 0 0 1-.555-.493 3.156 3.156 0 0 1-.417-.602 2.942 2.942 0 0 1-.26-.683 3.345 3.345 0 0 1-.095-.739c0-.423.08-.82.24-1.189a3.095 3.095 0 0 1 1.626-1.627 3.067 3.067 0 0 1 2.386-.007 3.095 3.095 0 0 1 1.627 1.627 3.067 3.067 0 0 1 .157 1.928c-.06.237-.148.465-.266.684a3.506 3.506 0 0 1-.417.608c-.16.187-.345.35-.554.492zM5.812 9.75c.301 0 .584-.057.848-.17a2.194 2.194 0 0 0 1.162-1.163c.119-.269.178-.554.178-.854a2.138 2.138 0 0 0-.643-1.538 2.383 2.383 0 0 0-.697-.472 2.048 2.048 0 0 0-.848-.178c-.3 0-.583.057-.847.17a2.218 2.218 0 0 0-1.17 1.17c-.113.264-.17.547-.17.848 0 .3.057.583.17.847.115.264.27.497.466.697a2.168 2.168 0 0 0 1.552.643zM15 1v7h-1.75l-2.625 2.625V8H9.75v-.875h1.75v1.388l1.388-1.388h1.237v-5.25h-8.75v1.572a7.255 7.255 0 0 0-.438.069 2.62 2.62 0 0 0-.437.123V1H15z"/>
  </svg>
)

export function Layout() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-4 text-white/85 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 border-b-[3px] ${
      isActive
        ? 'border-white bg-white/[0.18] text-white font-semibold'
        : 'border-transparent'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center">
          {/* Logo */}
          <NavLink
            to="/"
            className="text-white font-extrabold text-2xl py-4 mr-12 tracking-tight hover:opacity-90 transition-opacity"
          >
            Viriato
          </NavLink>

          {/* Nav tabs - flex-1 pushes feedback button to right */}
          <div className="flex gap-1 flex-1">
            <NavLink to="/assembleia" className={navLinkClass}>
              <AssembleiaIcon />
              <span className="hidden sm:inline">A Assembleia</span>
            </NavLink>
            <NavLink to="/iniciativas" className={navLinkClass}>
              <IniciativasIcon />
              <span className="hidden sm:inline">Iniciativas</span>
            </NavLink>
            <NavLink to="/agenda" className={navLinkClass}>
              <AgendaIcon />
              <span className="hidden sm:inline">Agenda</span>
            </NavLink>
            <NavLink to="/comissoes" className={navLinkClass}>
              <ComissoesIcon />
              <span className="hidden sm:inline">Comissoes</span>
            </NavLink>
          </div>

          {/* Feedback button */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            aria-label="Enviar sugestoes"
          >
            <FeedbackIcon />
            <span className="hidden sm:inline text-sm font-medium">Sugestoes</span>
          </button>
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

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  )
}
