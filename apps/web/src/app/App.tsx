import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute.tsx'
import { DcaPage } from '../pages/DcaPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { FairPricePage } from '../pages/FairPricePage.tsx'
import { FirePage } from '../pages/FirePage.tsx'
import { InvestCalcPage } from '../pages/InvestCalcPage.tsx'
import { LandingPage } from '../pages/LandingPage.tsx'
import { PlaceholderPage } from '../pages/PlaceholderPage.tsx'
import { StockPage } from '../pages/StockPage.tsx'
import { ToolsPage } from '../pages/ToolsPage.tsx'
import { LoginPage } from '../pages/auth/LoginPage.tsx'
import { RegisterPage } from '../pages/auth/RegisterPage.tsx'
import { useAuthStore } from '../store/useAuthStore.ts'

const routes = [
  { path: '/learn', titleKey: 'pages.learn.title', descriptionKey: 'pages.learn.description' },
  { path: '/pricing', titleKey: 'pages.pricing.title', descriptionKey: 'pages.pricing.description' },
] as const

export const App = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/invest-calc" element={<InvestCalcPage />} />
        <Route path="/tools/fire" element={<FirePage />} />
        <Route path="/tools/dca" element={<DcaPage />} />
        <Route path="/tools/fair-price" element={<FairPricePage />} />
        <Route path="/tools/stock" element={<StockPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <PlaceholderPage
                titleKey="pages.admin.title"
                descriptionKey="pages.admin.description"
              />
            </ProtectedRoute>
          }
        />
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <PlaceholderPage
                titleKey={route.titleKey}
                descriptionKey={route.descriptionKey}
              />
            }
          />
        ))}
      </Routes>
    </BrowserRouter>
  )
}
