import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  getCompanyByTicker,
  getFundamentalsByTicker,
  logToolUsage,
  searchCompaniesInDb,
  upsertCompany,
  upsertFundamentals,
} from '../db/queries'
import { getOptionalUser } from '../middleware/auth'
import { CacheTtl, getJsonCache, putJsonCache } from '../services/cache'
import {
  getFmpCompanyProfile,
  getFmpFundamentals,
  searchFmpCompanies,
} from '../services/fmp'
import type { AppEnv, Company, CompanyFundamentals } from '../types'
import { createError, createSuccess } from '../utils/response'

const companies = new Hono<AppEnv>()

const searchSchema = z.object({
  q: z.string().min(1).max(50),
})

const tickerSchema = z.object({
  ticker: z.string().min(1).max(12),
})

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

const logUsage = async (c: Context, toolType: string, ticker: string | null) => {
  const user = await getOptionalUser(c)
  await logToolUsage(c.env.DB, { userId: user?.id ?? null, toolType, ticker })
}

companies.get('/search', zValidator('query', searchSchema, validatorHook), async (c) => {
  const { q } = c.req.valid('query')
  const cacheKey = `search:${q.toLowerCase()}`
  c.executionCtx.waitUntil(logUsage(c, 'COMPANY_SEARCH', null).catch(() => undefined))

  const cached = await getJsonCache<Company[]>(c.env.KV, cacheKey)
  if (cached) {
    return c.json(createSuccess(cached))
  }

  const dbResults = await searchCompaniesInDb(c.env.DB, q)
  if (dbResults.length > 0) {
    await putJsonCache(c.env.KV, cacheKey, dbResults, CacheTtl.search)
    return c.json(createSuccess(dbResults))
  }

  try {
    const fmpResults = await searchFmpCompanies(q, c.env.FMP_API_KEY)
    await Promise.all(fmpResults.map((company) => upsertCompany(c.env.DB, company)))
    await putJsonCache(c.env.KV, cacheKey, fmpResults, CacheTtl.search)
    return c.json(createSuccess(fmpResults))
  } catch {
    return c.json(createError('COMPANY_SEARCH_FAILED', 'Company search failed'), 502)
  }
})

companies.get('/:ticker', zValidator('param', tickerSchema, validatorHook), async (c) => {
  const { ticker } = c.req.valid('param')
  const normalizedTicker = ticker.toUpperCase()
  const cacheKey = `company:${normalizedTicker}`

  const cached = await getJsonCache<Company>(c.env.KV, cacheKey)
  if (cached) {
    return c.json(createSuccess(cached))
  }

  const dbCompany = await getCompanyByTicker(c.env.DB, normalizedTicker)
  if (dbCompany) {
    await putJsonCache(c.env.KV, cacheKey, dbCompany, CacheTtl.company)
    return c.json(createSuccess(dbCompany))
  }

  try {
    const fmpCompany = await getFmpCompanyProfile(normalizedTicker, c.env.FMP_API_KEY)
    if (!fmpCompany) {
      return c.json(createError('COMPANY_NOT_FOUND', 'Company not found'), 404)
    }

    await upsertCompany(c.env.DB, fmpCompany)
    await putJsonCache(c.env.KV, cacheKey, fmpCompany, CacheTtl.company)
    return c.json(createSuccess(fmpCompany))
  } catch {
    return c.json(createError('COMPANY_FETCH_FAILED', 'Company fetch failed'), 502)
  }
})

companies.get(
  '/:ticker/fundamentals',
  zValidator('param', tickerSchema, validatorHook),
  async (c) => {
    const { ticker } = c.req.valid('param')
    const normalizedTicker = ticker.toUpperCase()
    const cacheKey = `fundamentals:${normalizedTicker}`

    const cached = await getJsonCache<CompanyFundamentals>(c.env.KV, cacheKey)
    if (cached) {
      return c.json(createSuccess(cached))
    }

    const dbFundamentals = await getFundamentalsByTicker(c.env.DB, normalizedTicker)
    if (dbFundamentals) {
      await putJsonCache(c.env.KV, cacheKey, dbFundamentals, CacheTtl.fundamentals)
      return c.json(createSuccess(dbFundamentals))
    }

    try {
      let company = await getCompanyByTicker(c.env.DB, normalizedTicker)
      if (!company) {
        const fmpCompany = await getFmpCompanyProfile(normalizedTicker, c.env.FMP_API_KEY)
        if (!fmpCompany) {
          return c.json(createError('COMPANY_NOT_FOUND', 'Company not found'), 404)
        }
        await upsertCompany(c.env.DB, fmpCompany)
        company = fmpCompany
      }

      const fundamentals = await getFmpFundamentals(company.id, normalizedTicker, c.env.FMP_API_KEY)
      await upsertFundamentals(c.env.DB, fundamentals)
      await putJsonCache(c.env.KV, cacheKey, fundamentals, CacheTtl.fundamentals)
      return c.json(createSuccess(fundamentals))
    } catch {
      return c.json(createError('FUNDAMENTALS_FETCH_FAILED', 'Fundamentals fetch failed'), 502)
    }
  },
)

export default companies
