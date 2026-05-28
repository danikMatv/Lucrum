import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '../pages/LandingPage.tsx'
import { PlaceholderPage } from '../pages/PlaceholderPage.tsx'

const routes = [
  { path: '/learn', titleKey: 'pages.learn.title', descriptionKey: 'pages.learn.description' },
  { path: '/tools', titleKey: 'pages.tools.title', descriptionKey: 'pages.tools.description' },
  {
    path: '/tools/invest-calc',
    titleKey: 'pages.investCalc.title',
    descriptionKey: 'pages.investCalc.description',
  },
  { path: '/tools/fire', titleKey: 'pages.fire.title', descriptionKey: 'pages.fire.description' },
  { path: '/tools/dca', titleKey: 'pages.dca.title', descriptionKey: 'pages.dca.description' },
  {
    path: '/tools/fair-price',
    titleKey: 'pages.fairPrice.title',
    descriptionKey: 'pages.fairPrice.description',
  },
  { path: '/tools/stock', titleKey: 'pages.stock.title', descriptionKey: 'pages.stock.description' },
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
