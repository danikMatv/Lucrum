export const CacheTtl = {
  company: 60 * 60,
  fundamentals: 6 * 60 * 60,
  history: 24 * 60 * 60,
  quote: 15 * 60,
  search: 60 * 60,
} as const

export const getJsonCache = async <T>(kv: KVNamespace, key: string): Promise<T | null> => {
  const cached = await kv.get(key)
  if (!cached) {
    return null
  }

  return JSON.parse(cached) as T
}

export const putJsonCache = async <T>(
  kv: KVNamespace,
  key: string,
  value: T,
  expirationTtl: number,
) => {
  await kv.put(key, JSON.stringify(value), { expirationTtl })
}
