import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
import { ReverseDcfPage } from '../pages/ReverseDcfPage.tsx'
import { StockPage } from '../pages/StockPage.tsx'
import { StockMiniCoursePage } from '../pages/StockMiniCoursePage.tsx'
import { ToolsPage } from '../pages/ToolsPage.tsx'
import { LoginPage } from '../pages/auth/LoginPage.tsx'
import { RegisterPage } from '../pages/auth/RegisterPage.tsx'
import i18n from '../i18n.ts'
import { applySeoToDocument } from '../seo/head.ts'
import type { Locale } from '../seo/locales.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

interface SeoManagerProps {
  locale: Locale
}

const SeoManager = ({ locale }: SeoManagerProps) => {
  const location = useLocation()

  useEffect(() => {
    document.documentElement.lang = locale
    applySeoToDocument(location.pathname, locale)
  }, [locale, location.pathname])

  return null
}

interface AppProps {
  locale: Locale
}

export const App = ({ locale }: AppProps) => {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  useEffect(() => {
    void i18n.changeLanguage(locale)
    void fetchMe()
  }, [fetchMe, locale])

  return (
    <>
      <SeoManager locale={locale} />
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
        <Route
          path="/tools/reverse-dcf"
          element={
            <ProtectedRoute>
              <ReverseDcfPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools/stock"
          element={
            <ProtectedRoute>
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/about"
          element={
            <PlaceholderPage
              titleKey="pages.about.title"
              descriptionKey="pages.about.description"
              bannerTitleKey="pages.about.feedback.title"
              bannerDescriptionKey="pages.about.feedback.description"
              bannerEmail="healthvoklen@gmail.com"
            />
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
        <Route
          path="/profile"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
