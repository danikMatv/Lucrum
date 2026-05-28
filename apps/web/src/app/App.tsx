import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DcaPage } from '../pages/DcaPage.tsx'
import { FairPricePage } from '../pages/FairPricePage.tsx'
import { FirePage } from '../pages/FirePage.tsx'
import { InvestCalcPage } from '../pages/InvestCalcPage.tsx'
import { LandingPage } from '../pages/LandingPage.tsx'
import { PlaceholderPage } from '../pages/PlaceholderPage.tsx'
import { StockPage } from '../pages/StockPage.tsx'

const routes = [
  { path: '/learn', titleKey: 'pages.learn.title', descriptionKey: 'pages.learn.description' },
  { path: '/tools', titleKey: 'pages.tools.title', descriptionKey: 'pages.tools.description' },
  {
    path: '/dashboard',
    titleKey: 'pages.dashboard.title',
    descriptionKey: 'pages.dashboard.description',
  },
  { path: '/pricing', titleKey: 'pages.pricing.title', descriptionKey: 'pages.pricing.description' },
  { path: '/auth/login', titleKey: 'pages.login.title', descriptionKey: 'pages.login.description' },
  {
    path: '/auth/register',
    titleKey: 'pages.register.title',
    descriptionKey: 'pages.register.description',
  },
  { path: '/admin', titleKey: 'pages.admin.title', descriptionKey: 'pages.admin.description' },
] as const

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tools/invest-calc" element={<InvestCalcPage />} />
        <Route path="/tools/fire" element={<FirePage />} />
        <Route path="/tools/dca" element={<DcaPage />} />
        <Route path="/tools/fair-price" element={<FairPricePage />} />
        <Route path="/tools/stock" element={<StockPage />} />
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
