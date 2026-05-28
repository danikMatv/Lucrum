import { AxiosError } from 'axios'
import type { ApiResponse } from '../types/api.ts'

const isApiErrorResponse = (value: unknown): value is Extract<ApiResponse<unknown>, { success: false }> => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { success?: unknown; error?: { message?: unknown } }
  return candidate.success === false && typeof candidate.error?.message === 'string'
}

export const parseApiError = (error: unknown, fallbackMessage = 'Something went wrong. Please try again.') => {
  if (error instanceof AxiosError) {
    const response = error.response?.data
    if (isApiErrorResponse(response)) {
      return response.error.message
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
