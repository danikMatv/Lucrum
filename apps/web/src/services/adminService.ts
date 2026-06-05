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

export const adminService = {
  getUserStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminUserStats>>('/api/admin/stats/users')
    return unwrapApiResponse(response.data)
  },
  getToolStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminToolStats[]>>('/api/admin/stats/tools')
    return unwrapApiResponse(response.data)
  },
  getTickerStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminTickerStats[]>>(
      '/api/admin/stats/tickers',
    )
    return unwrapApiResponse(response.data)
  },
  getDailyUsageStats: async () => {
    const response = await apiClient.get<ApiResponse<CountByDate[]>>(
      '/api/admin/stats/usage/daily',
    )
    return unwrapApiResponse(response.data)
  },
  getSourceStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/sources',
    )
    return unwrapApiResponse(response.data)
  },
  getLocationStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/locations',
    )
    return unwrapApiResponse(response.data)
  },
  getDeviceStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/devices',
    )
    return unwrapApiResponse(response.data)
  },
  getBrowserStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/browsers',
    )
    return unwrapApiResponse(response.data)
  },
  getOsStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/os',
    )
    return unwrapApiResponse(response.data)
  },
  getLanguageStats: async () => {
    const response = await apiClient.get<ApiResponse<AdminDimensionStats[]>>(
      '/api/admin/stats/languages',
    )
    return unwrapApiResponse(response.data)
  },
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
