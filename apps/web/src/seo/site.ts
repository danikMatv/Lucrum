const fallbackSiteUrl = 'http://localhost:5173'

export const getSiteOrigin = () => {
  const siteUrl = import.meta.env.VITE_SITE_URL?.trim()
  const origin = siteUrl && siteUrl.length > 0 ? siteUrl : fallbackSiteUrl
  return origin.replace(/\/$/, '')
}

export const absoluteUrl = (path: string) => `${getSiteOrigin()}${path}`
