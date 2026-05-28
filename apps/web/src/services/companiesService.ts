import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, Company, CompanyFundamentals } from '../types/api.ts'

export const companiesService = {
  search: async (q: string) => {
    const response = await apiClient.get<ApiResponse<Company[]>>('/api/companies/search', {
      params: { q },
    })
    return unwrapApiResponse(response.data)
  },
  getByTicker: async (ticker: string) => {
    const response = await apiClient.get<ApiResponse<Company>>(`/api/companies/${ticker}`)
    return unwrapApiResponse(response.data)
  },
  getFundamentals: async (ticker: string) => {
    const response = await apiClient.get<ApiResponse<CompanyFundamentals>>(
      `/api/companies/${ticker}/fundamentals`,
    )
    return unwrapApiResponse(response.data)
  },
}
