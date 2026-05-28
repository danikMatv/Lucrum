import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, SavedCalculation, WatchlistItem } from '../types/api.ts'

export const dashboardService = {
  getCalculations: async () => {
    const response = await apiClient.get<ApiResponse<SavedCalculation[]>>(
      '/api/dashboard/calculations',
    )
    return unwrapApiResponse(response.data)
  },
  saveCalculation: async (toolType: string, inputParams: unknown, resultSnapshot: unknown) => {
    const response = await apiClient.post<ApiResponse<SavedCalculation>>(
      '/api/dashboard/calculations',
      { toolType, inputParams, resultSnapshot },
    )
    return unwrapApiResponse(response.data)
  },
  deleteCalculation: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/api/dashboard/calculations/${id}`,
    )
    return unwrapApiResponse(response.data)
  },
  getWatchlist: async () => {
    const response = await apiClient.get<ApiResponse<WatchlistItem[]>>('/api/dashboard/watchlist')
    return unwrapApiResponse(response.data)
  },
  addToWatchlist: async (ticker: string, companyName: string) => {
    const response = await apiClient.post<ApiResponse<WatchlistItem>>('/api/dashboard/watchlist', {
      ticker,
      companyName,
    })
    return unwrapApiResponse(response.data)
  },
  removeFromWatchlist: async (ticker: string) => {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/api/dashboard/watchlist/${ticker}`,
    )
    return unwrapApiResponse(response.data)
  },
}
