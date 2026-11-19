import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CurrencyProvider } from './lib/currency'
import Layout from './components/Layout'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'

const queryClient = new QueryClient()

const sections = ['catalog', 'estimate', 'mortgage', 'favorites', 'assistant'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              {sections.map((s) => (
                <Route key={s} path={s} element={<Placeholder titleKey={`pages.${s}`} />} />
              ))}
              <Route path="*" element={<Placeholder titleKey="pages.notFound" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}
