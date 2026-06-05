import i18n from '../i18n.ts'
import { learnTopics } from '../data/learnTopics.ts'
import {
  defaultLocale,
  localizedPath,
  normalizePath,
  supportedLocales,
  type Locale,
} from './locales.ts'
import { absoluteUrl } from './site.ts'

type Translation = ReturnType<typeof i18n.getFixedT>
type RouteKind = 'home' | 'tool' | 'tools' | 'learning' | 'learningResource' | 'generic'

interface SeoRoute {
  path: string
  kind: RouteKind
  title: (t: Translation) => string
  description: (t: Translation) => string
  changefreq: 'weekly' | 'monthly'
  priority: number
}

export interface ResolvedSeoRoute {
  path: string
  locale: Locale
  title: string
  description: string
  canonicalPath: string
  canonicalUrl: string
  alternates: Array<{ locale: Locale | 'x-default'; href: string }>
  kind: RouteKind
}

const brandSuffix = (title: string) => `${title} | Lucrum`

const pageRoute = (
  path: string,
  titleKey: string,
  descriptionKey: string,
  kind: RouteKind,
  priority = 0.6,
): SeoRoute => ({
  path,
  kind,
  title: (t) => brandSuffix(t(titleKey)),
  description: (t) => t(descriptionKey),
  changefreq: 'monthly',
  priority,
})

const toolRoute = (path: string, titleKey: string, descriptionKey: string): SeoRoute => ({
  path,
  kind: 'tool',
  title: (t) => brandSuffix(t(titleKey)),
  description: (t) => t(descriptionKey),
  changefreq: 'weekly',
  priority: 0.8,
})

export const seoRoutes: SeoRoute[] = [
  {
    path: '/',
    kind: 'home',
    title: (t) =>
      `${t('brand.name')} - ${t('landing.hero.headlineLineOne')} ${t('landing.hero.headlineLineTwo')}`,
    description: (t) => t('landing.hero.subtext'),
    changefreq: 'weekly',
    priority: 1,
  },
  {
    path: '/tools',
    kind: 'tools',
    title: (t) => brandSuffix(t('toolsDirectory.title')),
    description: (t) => t('toolsDirectory.description'),
    changefreq: 'weekly',
    priority: 0.9,
  },
  toolRoute('/tools/invest-calc', 'tools.invest.title', 'tools.invest.description'),
  toolRoute('/tools/fire', 'tools.fire.title', 'tools.fire.description'),
  toolRoute('/tools/dca', 'tools.dca.title', 'tools.dca.description'),
  toolRoute('/tools/fair-price', 'tools.fairPrice.title', 'tools.fairPrice.description'),
  toolRoute('/tools/stock', 'tools.stock.title', 'tools.stock.description'),
  pageRoute('/learn', 'learnAcademy.title', 'learnAcademy.description', 'learning', 0.9),
  pageRoute(
    '/learn/stocks/course',
    'learnAcademy.miniCourse.title',
    'learnAcademy.miniCourse.description',
    'learningResource',
    0.75,
  ),
  ...learnTopics.map<SeoRoute>((topic) => ({
    path: topic.path,
    kind: 'learningResource',
    title: (t) => brandSuffix(t(`learnAcademy.topics.${topic.id}.title`)),
    description: (t) => t(`learnAcademy.topics.${topic.id}.summary`),
    changefreq: 'monthly',
    priority: 0.75,
  })),
  pageRoute('/pricing', 'pricing.stub.title', 'pricing.stub.description', 'generic', 0.4),
  pageRoute('/about', 'pages.about.title', 'pages.about.description', 'generic', 0.4),
  pageRoute('/privacy', 'pages.privacy.title', 'pages.privacy.description', 'generic', 0.3),
  pageRoute('/terms', 'pages.terms.title', 'pages.terms.description', 'generic', 0.3),
  pageRoute('/contact', 'pages.contact.title', 'pages.contact.description', 'generic', 0.3),
]

export const publicPaths = seoRoutes.map((route) => route.path)

export const prerenderPaths = supportedLocales.flatMap((locale) =>
  publicPaths.map((path) => localizedPath(path, locale)),
)

const routeByPath = new Map(seoRoutes.map((route) => [route.path, route]))

export const getSeoRoute = (path: string, locale: Locale): ResolvedSeoRoute | null => {
  const normalized = normalizePath(path === '/tools/fair-value' ? '/tools/fair-price' : path)
  const route = routeByPath.get(normalized)

  if (!route) {
    return null
  }

  const t = i18n.getFixedT(locale, 'common')
  const canonicalPath = localizedPath(route.path, locale)
  const alternates = [
    ...supportedLocales.map((alternateLocale) => ({
      locale: alternateLocale,
      href: absoluteUrl(localizedPath(route.path, alternateLocale)),
    })),
    {
      locale: 'x-default' as const,
      href: absoluteUrl(localizedPath(route.path, defaultLocale)),
    },
  ]

  return {
    path: route.path,
    locale,
    title: route.title(t),
    description: route.description(t),
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath),
    alternates,
    kind: route.kind,
  }
}

export const sitemapEntries = supportedLocales.flatMap((locale) =>
  seoRoutes.map((route) => ({
    path: localizedPath(route.path, locale),
    lastmod: '2026-06-05',
    changefreq: route.changefreq,
    priority: route.priority,
  })),
)
