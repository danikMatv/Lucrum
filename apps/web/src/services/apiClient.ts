import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types/api.ts'

const liveApiBaseUrl = 'https://lucrum-worker.danior202.workers.dev'
const attributionStorageKey = 'lucrum.analytics.attribution'

let accessToken: string | null = null
let isRefreshing = false

interface AttributionContext {
  source: string
  medium: string | null
  campaign: string | null
  referrer: string | null
}

const cleanHeaderValue = (value: string | null, maxLength: number) => {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, maxLength)
}

const externalReferrerOrigin = () => {
  if (!document.referrer) {
    return null
  }

  try {
    const referrer = new URL(document.referrer)
    return referrer.origin === window.location.origin ? null : referrer.origin
  } catch {
    return null
  }
}

const readStoredAttribution = () => {
  try {
    const stored = window.sessionStorage.getItem(attributionStorageKey)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as Partial<AttributionContext>
    if (!parsed.source) {
      return null
    }

    return {
      source: parsed.source,
      medium: parsed.medium ?? null,
      campaign: parsed.campaign ?? null,
      referrer: parsed.referrer ?? null,
    }
  } catch {
    return null
  }
}

const writeStoredAttribution = (attribution: AttributionContext) => {
  try {
    window.sessionStorage.setItem(attributionStorageKey, JSON.stringify(attribution))
  } catch {
    // Analytics attribution is best-effort and should never block API calls.
  }
}

const getAttributionContext = (): AttributionContext => {
  const params = new URLSearchParams(window.location.search)
  const utmSource = cleanHeaderValue(params.get('utm_source'), 80)
  const utmMedium = cleanHeaderValue(params.get('utm_medium'), 80)
  const utmCampaign = cleanHeaderValue(params.get('utm_campaign'), 120)
  const referrer = cleanHeaderValue(externalReferrerOrigin(), 240)

  if (utmSource) {
    const attribution = {
      source: utmSource,
      medium: utmMedium,
      campaign: utmCampaign,
      referrer,
    }
    writeStoredAttribution(attribution)
    return attribution
  }

  const stored = readStoredAttribution()
  if (stored) {
    return stored
  }

  const attribution = {
    source: referrer ? new URL(referrer).hostname.replace(/^www\./, '') : 'direct',
    medium: referrer ? 'referral' : null,
    campaign: null,
    referrer,
  }
  writeStoredAttribution(attribution)
  return attribution
}

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || liveApiBaseUrl,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  const attribution = getAttributionContext()
  config.headers['X-Lucrum-Source'] = attribution.source
  if (attribution.medium) {
    config.headers['X-Lucrum-Medium'] = attribution.medium
  }
  if (attribution.campaign) {
    config.headers['X-Lucrum-Campaign'] = attribution.campaign
  }
  if (attribution.referrer) {
    config.headers['X-Lucrum-Referrer'] = attribution.referrer
  }
  config.headers['X-Lucrum-Page-Path'] = `${window.location.pathname}${window.location.search}`.slice(
    0,
    240,
  )
  config.headers['X-Lucrum-Language'] = navigator.language.slice(0, 40)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/refresh') &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/register') &&
      !originalRequest.url?.includes('/api/auth/me')
    ) {
      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        try {
          await apiClient.post<ApiResponse<{ refreshed: boolean }>>('/api/auth/refresh')
          return apiClient(originalRequest)
        } catch (refreshError) {
          setAccessToken(null)
          if (window.location.pathname !== '/auth/login') {
            window.location.assign('/auth/login')
          }
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
    }

    return Promise.reject(error)
  },
)

export const unwrapApiResponse = <T>(response: ApiResponse<T>) => {
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}
