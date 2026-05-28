import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, DcaResult, StockHistory } from '../types/api.ts'

export const toolsService = {
  getStockHistory: async (ticker: string, period: string) => {
    const response = await apiClient.get<ApiResponse<StockHistory>>('/api/tools/stock-history', {
      params: { ticker, period },
    })
    return unwrapApiResponse(response.data)
  },
  getDCA: async (ticker: string, from: string, amount: number) => {
    const response = await apiClient.get<ApiResponse<DcaResult>>('/api/tools/dca', {
      params: { ticker, from, amount },
    })
    return unwrapApiResponse(response.data)
  },
}
