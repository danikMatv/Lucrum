import type { Context } from 'hono'

export interface ToolUsageAnalyticsInput {
  source: string | null
  medium: string | null
  campaign: string | null
  referrer: string | null
  pagePath: string | null
  country: string | null
  region: string | null
  city: string | null
  timezone: string | null
  colo: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  language: string | null
}

type CfAnalyticsProperties = {
  country?: string
  region?: string
  city?: string
  timezone?: string
  colo?: string
}

const headerLimits = {
  source: 80,
  medium: 80,
  campaign: 120,
  referrer: 240,
  pagePath: 240,
  location: 120,
  technology: 80,
  language: 40,
}

const cleanText = (value: string | undefined, maxLength: number) => {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, maxLength)
}

const cleanCfText = (
  cf: CfAnalyticsProperties | undefined,
  key: keyof CfAnalyticsProperties,
  maxLength = headerLimits.location,
) => {
  const value = cf?.[key]
  return typeof value === 'string' ? cleanText(value, maxLength) : null
}

const isInternalReferrer = (referrer: string | null, requestUrl: string) => {
  if (!referrer) {
    return false
  }

  try {
    return new URL(referrer).hostname === new URL(requestUrl).hostname
  } catch {
    return false
  }
}

const sourceFromReferrer = (referrer: string | null, requestUrl: string) => {
  if (!referrer) {
    return 'direct'
  }

  if (isInternalReferrer(referrer, requestUrl)) {
    return 'internal'
  }

  try {
    return new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return 'referral'
  }
}

const parseDeviceType = (userAgent: string | null) => {
  const agent = userAgent?.toLowerCase() ?? ''
  if (!agent) {
    return null
  }
  if (/bot|crawler|spider|crawling/.test(agent)) {
    return 'bot'
  }
  if (/ipad|tablet|kindle|silk/.test(agent)) {
    return 'tablet'
  }
  if (/mobi|iphone|android/.test(agent)) {
    return 'mobile'
  }
  return 'desktop'
}

const parseBrowser = (userAgent: string | null) => {
  const agent = userAgent ?? ''
  if (!agent) {
    return null
  }
  if (/Edg\//.test(agent)) {
    return 'Edge'
  }
  if (/OPR\//.test(agent)) {
    return 'Opera'
  }
  if (/SamsungBrowser\//.test(agent)) {
    return 'Samsung Internet'
  }
  if (/Firefox\//.test(agent)) {
    return 'Firefox'
  }
  if (/Chrome\//.test(agent) || /CriOS\//.test(agent)) {
    return 'Chrome'
  }
  if (/Safari\//.test(agent)) {
    return 'Safari'
  }
  return 'Other'
}

const parseOs = (userAgent: string | null) => {
  const agent = userAgent ?? ''
  if (!agent) {
    return null
  }
  if (/Windows NT/.test(agent)) {
    return 'Windows'
  }
  if (/CrOS/.test(agent)) {
    return 'ChromeOS'
  }
  if (/Android/.test(agent)) {
    return 'Android'
  }
  if (/iPhone|iPad|iPod/.test(agent)) {
    return 'iOS'
  }
  if (/Mac OS X|Macintosh/.test(agent)) {
    return 'macOS'
  }
  if (/Linux/.test(agent)) {
    return 'Linux'
  }
  return 'Other'
}

export const getToolUsageAnalytics = (c: Context): ToolUsageAnalyticsInput => {
  const userAgent = cleanText(c.req.header('User-Agent'), 500)
  const referrer =
    cleanText(c.req.header('X-Lucrum-Referrer'), headerLimits.referrer) ??
    cleanText(c.req.header('Referer'), headerLimits.referrer)
  const source =
    cleanText(c.req.header('X-Lucrum-Source'), headerLimits.source) ??
    sourceFromReferrer(referrer, c.req.url)
  const cf = c.req.raw.cf as CfAnalyticsProperties | undefined

  return {
    source,
    medium: cleanText(c.req.header('X-Lucrum-Medium'), headerLimits.medium),
    campaign: cleanText(c.req.header('X-Lucrum-Campaign'), headerLimits.campaign),
    referrer,
    pagePath: cleanText(c.req.header('X-Lucrum-Page-Path'), headerLimits.pagePath),
    country: cleanCfText(cf, 'country'),
    region: cleanCfText(cf, 'region'),
    city: cleanCfText(cf, 'city'),
    timezone: cleanCfText(cf, 'timezone'),
    colo: cleanCfText(cf, 'colo', headerLimits.technology),
    deviceType: parseDeviceType(userAgent),
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    language: cleanText(c.req.header('X-Lucrum-Language'), headerLimits.language),
  }
}
