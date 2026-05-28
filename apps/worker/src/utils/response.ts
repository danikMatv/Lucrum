export interface ApiError {
  code: string
  message: string
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

export const createSuccess = <T>(data: T, _status = 200): ApiResponse<T> => ({
  success: true,
  data,
})

export const createError = (
  code: string,
  message: string,
  _status = 400,
): ApiResponse<never> => ({
  success: false,
  error: { code, message },
})
