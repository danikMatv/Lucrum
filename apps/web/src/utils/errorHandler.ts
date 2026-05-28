import { AxiosError } from 'axios'
import type { ApiResponse } from '../types/api.ts'

const isApiErrorResponse = (value: unknown): value is Extract<ApiResponse<unknown>, { success: false }> => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { success?: unknown; error?: { message?: unknown } }
  return candidate.success === false && typeof candidate.error?.message === 'string'
}

const isValidationIssue = (value: unknown): value is { message: string } => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { message?: unknown }
  return typeof candidate.message === 'string'
}

const parseValidationMessage = (message: string, validationMessage?: string) => {
  try {
    const parsed = JSON.parse(message) as unknown
    if (Array.isArray(parsed) && parsed.some(isValidationIssue)) {
      return validationMessage ?? parsed.find(isValidationIssue)?.message ?? message
    }
  } catch {
    return message
  }

  return message
}

export const parseApiError = (
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
  validationMessage?: string,
) => {
  if (error instanceof AxiosError) {
    const response = error.response?.data
    if (isApiErrorResponse(response)) {
      return parseValidationMessage(response.error.message, validationMessage)
    }
    return parseValidationMessage(error.message, validationMessage)
  }

  if (error instanceof Error) {
    return parseValidationMessage(error.message, validationMessage)
  }

  return fallbackMessage
}
