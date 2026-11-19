import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CurrencyProvider } from './lib/currency'
import Layout from './components/Layout'
import Catalog from './pages/Catalog'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import UiDemo from './pages/UiDemo'
import { ToastProvider } from './components/ui/Toast'

// Страница дома тянет карту (Leaflet), поэтому грузится отдельным файлом
const Property = lazy(() => import('./pages/Property'))

const queryClient = new QueryClient()

const sections = ['estimate', 'mortgage', 'favorites', 'assistant'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
       <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="catalog/:id" element={<Suspense fallback={null}><Property /></Suspense>} />
              <Route path="ui" element={<UiDemo />} />
              {sections.map((s) => (
                <Route key={s} path={s} element={<Placeholder titleKey={`pages.${s}`} />} />
              ))}
              <Route path="*" element={<Placeholder titleKey="pages.notFound" />} />
            </Route>
          </Routes>
        </BrowserRouter>
       </ToastProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}
