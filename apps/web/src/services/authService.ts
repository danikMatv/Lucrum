import { apiClient, unwrapApiResponse } from './apiClient.ts'
import type { ApiResponse, User } from '../types/api.ts'

export const authService = {
  register: async (firstName: string, lastName: string, email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/api/auth/register', {
      firstName,
      lastName,
      email,
      password,
    })
    return unwrapApiResponse(response.data)
  },
  login: async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/api/auth/login', {
      email,
      password,
    })
    return unwrapApiResponse(response.data)
  },
  logout: async () => {
    const response = await apiClient.post<ApiResponse<{ loggedOut: boolean }>>('/api/auth/logout')
    return unwrapApiResponse(response.data)
  },
  me: async () => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/api/auth/me')
    return unwrapApiResponse(response.data)
  },
  refresh: async () => {
    const response = await apiClient.post<ApiResponse<{ refreshed: boolean }>>('/api/auth/refresh')
    return unwrapApiResponse(response.data)
  },
}
