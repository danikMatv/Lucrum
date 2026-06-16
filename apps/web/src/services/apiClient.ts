import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types/api.ts'

const liveApiBaseUrl = 'https://lucrum-worker.danior202.workers.dev'

let accessToken: string | null = null
let isRefreshing = false

const getReferrerSource = (referrer: string) => {
  if (!referrer) {
    return 'direct'
  }

  try {
    const referrerHost = new URL(referrer).hostname
    return referrerHost === window.location.hostname ? 'internal' : referrerHost.replace(/^www\./, '')
  } catch {
    return 'referral'
  }
}

const getAnalyticsHeaders = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  const params = new URLSearchParams(window.location.search)
  const referrer = document.referrer

  return {
    'X-Lucrum-Source': params.get('utm_source') || getReferrerSource(referrer),
    'X-Lucrum-Medium': params.get('utm_medium') || '',
    'X-Lucrum-Campaign': params.get('utm_campaign') || '',
    'X-Lucrum-Referrer': referrer,
    'X-Lucrum-Page-Path': `${window.location.pathname}${window.location.search}`,
    'X-Lucrum-Language': navigator.language,
  }
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
  Object.entries(getAnalyticsHeaders()).forEach(([key, value]) => {
    if (value) {
      config.headers[key] = value
    }
  })
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
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
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
