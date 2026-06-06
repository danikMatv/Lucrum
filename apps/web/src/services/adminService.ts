import { AxiosError } from 'axios'
import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type {
  AdminTickerStats,
  AdminDimensionStats,
  AdminToolStats,
  AdminUser,
  AdminUserStats,
  ApiResponse,
  CountByDate,
  UserRole,
} from '../types/api.ts'

const isNotFoundApiResponse = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { success?: unknown; error?: { code?: unknown; message?: unknown } }
  return (
    candidate.success === false &&
    candidate.error?.code === 'NOT_FOUND' &&
    candidate.error.message === 'Route not found'
  )
}

const withOptionalAdminStatsFallback = async <T>(
  request: () => Promise<T>,
  fallback: T,
) => {
  try {
    return await request()
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      if (isNotFoundApiResponse(error.response.data)) {
        return fallback
      }
    }

    throw error
  }
}

export const adminService = {
  getUserStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminUserStats>>('/api/admin/stats/users')
    return unwrapApiResponse(response.data)
  },
  getToolStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminToolStats[]>>('/api/admin/stats/tools')
    return unwrapApiResponse(response.data)
    }, []),
  getTickerStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminTickerStats[]>>(
      '/api/admin/stats/tickers',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getDailyUsageStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<CountByDate[]>>(
      '/api/admin/stats/usage/daily',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getSourceStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/sources',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getLocationStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/locations',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getDeviceStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/devices',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getBrowserStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/browsers',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getOsStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/os',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getLanguageStats: () =>
    withOptionalAdminStatsFallback(async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/languages',
    )
    return unwrapApiResponse(response.data)
    }, []),
  getUsers: async (page = 1, limit = 20) => {
    const response = await apiClient.get<ApiResponse<AdminUser[]>>('/api/admin/users', {
      params: { page, limit },
    })
    return unwrapApiResponse(response.data)
  },
  updateUserRole: async (id: string, role: UserRole) => {
    const response = await apiClient.patch<ApiResponse<{ updated: boolean }>>(
      `/api/admin/users/${id}/role`,
      { role },
    )
    return unwrapApiResponse(response.data)
  },
  updateUserActiveState: async (id: string, isActive: boolean) => {
    const response = await apiClient.patch<ApiResponse<{ updated: boolean }>>(
      `/api/admin/users/${id}/active`,
      { isActive },
    )
    return unwrapApiResponse(response.data)
  },
}
