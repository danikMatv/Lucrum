import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute.tsx'
import { AdminPage } from '../pages/AdminPage.tsx'
import { DcaPage } from '../pages/DcaPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { FairPricePage } from '../pages/FairPricePage.tsx'
import { FirePage } from '../pages/FirePage.tsx'
import { InvestCalcPage } from '../pages/InvestCalcPage.tsx'
import { LandingPage } from '../pages/LandingPage.tsx'
import { LearnPage } from '../pages/LearnPage.tsx'
import { LearnTopicPage } from '../pages/LearnTopicPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { PlaceholderPage } from '../pages/PlaceholderPage.tsx'
import { PricingPage } from '../pages/PricingPage.tsx'
import { StockPage } from '../pages/StockPage.tsx'
import { StockMiniCoursePage } from '../pages/StockMiniCoursePage.tsx'
import { ToolsPage } from '../pages/ToolsPage.tsx'
import { LoginPage } from '../pages/auth/LoginPage.tsx'
import { RegisterPage } from '../pages/auth/RegisterPage.tsx'
import { useAuthStore } from '../store/useAuthStore.ts'

export const App = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/stocks/course" element={<StockMiniCoursePage />} />
        <Route path="/learn/:topicId" element={<LearnTopicPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/invest-calc" element={<InvestCalcPage />} />
        <Route path="/tools/fire" element={<FirePage />} />
        <Route path="/tools/dca" element={<DcaPage />} />
        <Route path="/tools/fair-price" element={<FairPricePage />} />
        <Route path="/tools/fair-value" element={<Navigate to="/tools/fair-price" replace />} />
        <Route path="/tools/stock" element={<StockPage />} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/about"
          element={
            <PlaceholderPage titleKey="pages.about.title" descriptionKey="pages.about.description" />
          }
        />
        <Route
          path="/privacy"
          element={
            <PlaceholderPage
              titleKey="pages.privacy.title"
              descriptionKey="pages.privacy.description"
            />
          }
        />
        <Route
          path="/terms"
          element={
            <PlaceholderPage titleKey="pages.terms.title" descriptionKey="pages.terms.description" />
          }
        />
        <Route
          path="/contact"
          element={
            <PlaceholderPage
              titleKey="pages.contact.title"
              descriptionKey="pages.contact.description"
            />
          }
        />
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
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
