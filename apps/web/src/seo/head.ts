import { localizedPath, normalizePath, type Locale } from './locales.ts'
import { absoluteUrl, getSiteOrigin } from './site.ts'
import { getSeoRoute, sitemapEntries } from './routes.ts'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const jsonScript = (data: unknown) =>
  `<script type="application/ld+json" data-lucrum-seo="true">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

const breadcrumbLabels = (path: string) => {
  const normalized = normalizePath(path)
  if (normalized === '/') {
    return []
  }

  const segments = normalized.split('/').filter(Boolean)
  return segments.map((segment, index) => ({
    path: `/${segments.slice(0, index + 1).join('/')}`,
    name: segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
  }))
}

export const getStructuredData = (path: string, locale: Locale) => {
  const route = getSeoRoute(path, locale)
  if (!route) {
    return []
  }

  const data: unknown[] = []

  if (route.kind === 'home') {
    data.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Lucrum',
        url: getSiteOrigin(),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Lucrum',
        url: getSiteOrigin(),
        inLanguage: locale,
      },
    )
  }

  if (route.kind === 'tool' || route.kind === 'tools') {
    data.push({
      '@context': 'https://schema.org',
      '@type': route.kind === 'tool' ? 'SoftwareApplication' : 'WebApplication',
      name: route.title.replace(' | Lucrum', ''),
      description: route.description,
      url: route.canonicalUrl,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: locale,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    })
  }

  if (route.kind === 'learning' || route.kind === 'learningResource') {
    data.push({
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: route.title.replace(' | Lucrum', ''),
      description: route.description,
      url: route.canonicalUrl,
      inLanguage: locale,
      educationalLevel: 'Beginner',
    })
  }

  const breadcrumbs = breadcrumbLabels(route.path)
  if (breadcrumbs.length > 0) {
    data.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Lucrum',
          item: absoluteUrl(localizedPath('/', locale)),
        },
        ...breadcrumbs.map((breadcrumb, index) => ({
          '@type': 'ListItem',
          position: index + 2,
          name: index === breadcrumbs.length - 1 ? route.title.replace(' | Lucrum', '') : breadcrumb.name,
          item: absoluteUrl(localizedPath(breadcrumb.path, locale)),
        })),
      ],
    })
  }

  return data
}

export const createSeoHead = (path: string, locale: Locale) => {
  const route = getSeoRoute(path, locale)

  if (!route) {
    return [
      '<title>Lucrum</title>',
      '<meta name="robots" content="noindex,follow" />',
    ].join('\n')
  }

  const alternateLinks = route.alternates
    .map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate.locale}" href="${escapeHtml(alternate.href)}" />`,
    )
    .join('\n')

  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(route.canonicalUrl)}" />`,
    alternateLinks,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(route.canonicalUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary" />',
    ...getStructuredData(path, locale).map(jsonScript),
  ].join('\n')
}

export const applySeoToDocument = (path: string, locale: Locale) => {
  if (typeof document === 'undefined') {
    return
  }

  const route = getSeoRoute(path, locale)
  if (!route) {
    document.title = 'Lucrum'
    return
  }

  document.documentElement.lang = locale
  document.title = route.title

  const ensureMeta = (selector: string, create: () => HTMLMetaElement) => {
    const current = document.head.querySelector(selector)
    if (current instanceof HTMLMetaElement) {
      return current
    }

    const next = create()
    document.head.append(next)
    return next
  }

  ensureMeta('meta[name="description"]', () => {
    const meta = document.createElement('meta')
    meta.name = 'description'
    return meta
  }).content = route.description

  ensureMeta('meta[property="og:title"]', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'og:title')
    return meta
  }).content = route.title

  ensureMeta('meta[property="og:description"]', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'og:description')
    return meta
  }).content = route.description

  ensureMeta('meta[property="og:url"]', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'og:url')
    return meta
  }).content = route.canonicalUrl

  const currentCanonical = document.head.querySelector('link[rel="canonical"]')
  const canonical =
    currentCanonical instanceof HTMLLinkElement
      ? currentCanonical
      : document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = route.canonicalUrl
  if (!currentCanonical) {
    document.head.append(canonical)
  }

  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((alternate) => alternate.remove())
  route.alternates.forEach((alternate) => {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.hreflang = alternate.locale
    link.href = alternate.href
    document.head.append(link)
  })

  document.head
    .querySelectorAll('script[type="application/ld+json"][data-lucrum-seo]')
    .forEach((script) => script.remove())
  getStructuredData(path, locale).forEach((data) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.lucrumSeo = 'true'
    script.textContent = JSON.stringify(data)
    document.head.append(script)
  })
}

export const createSitemapXml = () => {
  const urls = sitemapEntries
    .map(
      (entry) => `  <url>
    <loc>${escapeHtml(absoluteUrl(entry.path))}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export const createRobotsTxt = () => `User-agent: *
Allow: /
Disallow: /auth/
Disallow: /*/auth/
Disallow: /dashboard
Disallow: /*/dashboard
Disallow: /admin
Disallow: /*/admin

Sitemap: ${absoluteUrl('/sitemap.xml')}
`

export const createRedirects = () => `/uk/* /:splat 301
/uk / 301
/tools/fair-value /tools/fair-price 301
/en/tools/fair-value /en/tools/fair-price 301
/fr/tools/fair-value /fr/tools/fair-price 301
/* /index.html 200
`
