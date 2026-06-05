import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import './index.css'
import './i18n.ts'
import i18n from './i18n.ts'
import { App } from './app/App.tsx'
import { parseLocalizedPath } from './seo/locales.ts'

const parsedPath = parseLocalizedPath(window.location.pathname)

if (parsedPath.redirectPath) {
  window.location.replace(`${parsedPath.redirectPath}${window.location.search}${window.location.hash}`)
} else {
  const queryClient = new QueryClient()
  void i18n.changeLanguage(parsedPath.locale)

  hydrateRoot(
    document.getElementById('root')!,
    <StrictMode>
      <BrowserRouter basename={parsedPath.basename}>
        <QueryClientProvider client={queryClient}>
          <App locale={parsedPath.locale} />
        </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
