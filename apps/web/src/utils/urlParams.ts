export const getSearchParams = () =>
  typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)

export const getNumberParam = (
  params: URLSearchParams,
  key: string,
  fallback: number,
  options: { min?: number; max?: number } = {},
) => {
  const rawValue = params.get(key)
  if (rawValue === null) {
    return fallback
  }

  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    return fallback
  }

  if (options.min !== undefined && value < options.min) {
    return fallback
  }

  if (options.max !== undefined && value > options.max) {
    return fallback
  }

  return value
}

export const getStringParam = (
  params: URLSearchParams,
  key: string,
  fallback: string,
  pattern?: RegExp,
) => {
  const value = params.get(key)?.trim()
  if (!value) {
    return fallback
  }

  return pattern && !pattern.test(value) ? fallback : value
}

export const getUnionParam = <T extends string | number>(
  params: URLSearchParams,
  key: string,
  fallback: T,
  allowed: readonly T[],
) => {
  const value = params.get(key)
  const matchedValue = allowed.find((item) => String(item) === value)
  return matchedValue ?? fallback
}
