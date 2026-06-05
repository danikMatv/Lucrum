import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types/api.ts'

const liveApiBaseUrl = 'https://lucrum-worker.danior202.workers.dev'

let accessToken: string | null = null
let isRefreshing = false

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
