import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { AssembleiaPage } from './pages/AssembleiaPage'
import { IniciativasPage } from './pages/IniciativasPage'
import { AgendaPage } from './pages/AgendaPage'
import { ComissoesPage } from './pages/ComissoesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="assembleia" element={<AssembleiaPage />} />
            <Route path="iniciativas" element={<IniciativasPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="comissoes" element={<ComissoesPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
