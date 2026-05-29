import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, LearnResource, LearnResourceType } from '../types/api.ts'

export interface LearnResourceInput {
  title: string
  url: string
  type: LearnResourceType
  description?: string
}

export interface LearnResourceUpdate {
  title?: string
  url?: string
  type?: LearnResourceType
  description?: string | null
  is_active?: boolean
}

export const learnService = {
  getResources: async (topic: string) => {
    const response = await apiClient.get<ApiResponse<LearnResource[]>>(
      `/api/learn/${topic}/resources`,
    )
    return unwrapApiResponse(response.data)
  },
  addResource: async (topic: string, input: LearnResourceInput) => {
    const response = await apiClient.post<ApiResponse<LearnResource>>(
      `/api/learn/${topic}/resources`,
      input,
    )
    return unwrapApiResponse(response.data)
  },
  updateResource: async (topic: string, id: string, input: LearnResourceUpdate) => {
    const response = await apiClient.patch<ApiResponse<LearnResource>>(
      `/api/learn/${topic}/resources/${id}`,
      input,
    )
    return unwrapApiResponse(response.data)
  },
  deleteResource: async (topic: string, id: string) => {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/api/learn/${topic}/resources/${id}`,
    )
    return unwrapApiResponse(response.data)
  },
}
