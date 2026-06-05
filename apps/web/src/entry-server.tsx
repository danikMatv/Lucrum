import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n.ts'
import i18n from './i18n.ts'
import { App } from './app/App.tsx'
import { createRedirects, createRobotsTxt, createSeoHead, createSitemapXml } from './seo/head.ts'
import { parseLocalizedPath } from './seo/locales.ts'
import { prerenderPaths } from './seo/routes.ts'

export const render = (url: string) => {
  const parsedPath = parseLocalizedPath(url)
  void i18n.changeLanguage(parsedPath.locale)

  const appHtml = renderToString(
    <StrictMode>
      <StaticRouter location={url} basename={parsedPath.basename}>
        <QueryClientProvider client={new QueryClient()}>
          <App locale={parsedPath.locale} />
        </QueryClientProvider>
      </StaticRouter>
    </StrictMode>,
  )

  return {
    appHtml,
    headHtml: createSeoHead(parsedPath.path, parsedPath.locale),
    lang: parsedPath.locale,
  }
}

export const getPrerenderPaths = () => prerenderPaths

export { createRedirects, createRobotsTxt, createSitemapXml }
