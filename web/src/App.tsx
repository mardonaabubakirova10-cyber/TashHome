import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CollectionsProvider } from './lib/collections'
import { CurrencyProvider } from './lib/currency'
import Layout from './components/Layout'
import Catalog from './pages/Catalog'
import Estimate from './pages/Estimate'
import Compare from './pages/Compare'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import Mortgage from './pages/Mortgage'
import Placeholder from './pages/Placeholder'
import UiDemo from './pages/UiDemo'
import { ToastProvider } from './components/ui/Toast'

// Страница дома тянет карту (Leaflet), поэтому грузится отдельным файлом
const Property = lazy(() => import('./pages/Property'))

const queryClient = new QueryClient()

const sections = ['assistant'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
       <ToastProvider>
        <CollectionsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="estimate" element={<Estimate />} />
              <Route path="mortgage" element={<Mortgage />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="compare" element={<Compare />} />
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
        </CollectionsProvider>
       </ToastProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}
