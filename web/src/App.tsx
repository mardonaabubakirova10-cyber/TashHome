import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import { ChatProvider } from './lib/chat'
import { CollectionsProvider } from './lib/collections'
import { CurrencyProvider } from './lib/currency'
import Layout from './components/Layout'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminKnowledge from './pages/admin/AdminKnowledge'
import AdminLeads from './pages/admin/AdminLeads'
import AdminProperties from './pages/admin/AdminProperties'
import AdminLogin from './pages/admin/AdminLogin'
import AdminReviews from './pages/admin/AdminReviews'
import AdminTexts from './pages/admin/AdminTexts'
import Assistant from './pages/Assistant'
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
       <ToastProvider>
        <CollectionsProvider>
        <AuthProvider>
        <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="properties" element={<AdminProperties />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="texts" element={<AdminTexts />} />
              <Route path="kb" element={<AdminKnowledge />} />
            </Route>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="estimate" element={<Estimate />} />
              <Route path="mortgage" element={<Mortgage />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="compare" element={<Compare />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="catalog/:id" element={<Suspense fallback={null}><Property /></Suspense>} />
              <Route path="ui" element={<UiDemo />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="*" element={<Placeholder titleKey="pages.notFound" />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ChatProvider>
        </AuthProvider>
        </CollectionsProvider>
       </ToastProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}
