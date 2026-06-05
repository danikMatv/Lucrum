export const supportedLocales = ['uk', 'en', 'fr'] as const
export type Locale = (typeof supportedLocales)[number]

export const defaultLocale: Locale = 'uk'
export const prefixedLocales = ['en', 'fr'] as const

export const isLocale = (value: string | undefined): value is Locale =>
  supportedLocales.includes(value as Locale)

export const normalizePath = (path: string) => {
  const [pathname] = path.split(/[?#]/)
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const normalized = withSlash.replace(/\/{2,}/g, '/')
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized
}

export const getLocaleBasename = (locale: Locale) =>
  locale === defaultLocale ? undefined : `/${locale}`

export const localizedPath = (path: string, locale: Locale) => {
  const normalized = normalizePath(path)
  if (locale === defaultLocale) {
    return normalized
  }

  return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`
}

export const parseLocalizedPath = (pathname: string) => {
  const normalized = normalizePath(pathname)
  const [, firstSegment, ...restSegments] = normalized.split('/')

  if (firstSegment === defaultLocale) {
    const pathWithoutLocale = restSegments.length > 0 ? `/${restSegments.join('/')}` : '/'
    return {
      locale: defaultLocale,
      path: normalizePath(pathWithoutLocale),
      basename: undefined,
      redirectPath: normalizePath(pathWithoutLocale),
    }
  }

  if (isLocale(firstSegment)) {
    const pathWithoutLocale = restSegments.length > 0 ? `/${restSegments.join('/')}` : '/'
    return {
      locale: firstSegment,
      path: normalizePath(pathWithoutLocale),
      basename: getLocaleBasename(firstSegment),
      redirectPath: undefined,
    }
  }

  return {
    locale: defaultLocale,
    path: normalized,
    basename: undefined,
    redirectPath: undefined,
  }
}
