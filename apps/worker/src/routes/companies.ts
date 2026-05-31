import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  getCompanySnapshotByTicker,
  getCompanyByTicker,
  getFundamentalsByTicker,
  logToolUsage,
  replaceCompanySnapshot,
  searchCompaniesInDb,
  upsertCompanySnapshot,
  upsertCompany,
  upsertFundamentals,
} from '../db/queries'
import { getOptionalUser } from '../middleware/auth'
import { CacheTtl, getJsonCache, putJsonCache } from '../services/cache'
import {
  getFmpCompanyProfile,
  getFmpFundamentals,
  getFmpQuote,
  searchFmpCompanies,
} from '../services/fmp'
import { getStooqQuote } from '../services/stooq'
import { getSecCompanyProfile, getSecFundamentals } from '../services/sec'
import { getYahooQuote, type StockQuote } from '../services/yahoo'
import type { AppEnv, Company, CompanyFundamentals } from '../types'
import { createError, createSuccess } from '../utils/response'
import { normalizeTicker } from '../utils/ticker'

const companies = new Hono<AppEnv>()
const snapshotMaxAgeMs = 90 * 24 * 60 * 60 * 1000

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

const nowIso = () => new Date().toISOString()

const isFresh = (timestamp: string | null) => {
  if (!timestamp) {
    return false
  }

  const time = new Date(timestamp).getTime()
  return Number.isFinite(time) && Date.now() - time <= snapshotMaxAgeMs
}

const freshnessFor = (hasValue: boolean, fetchedAt: string | null) => {
  if (!hasValue) {
    return 'missing' as const
  }

  return isFresh(fetchedAt) ? ('fresh' as const) : ('stale' as const)
}

const hasCompanyDisplayFields = (company: Company | null) =>
  Boolean(company?.exchange && company.sector)

const hasSnapshotFundamentals = (fundamentals: CompanyFundamentals | null) =>
  Boolean(
    fundamentals &&
      typeof fundamentals.peRatio === 'number' &&
      typeof fundamentals.marketCap === 'number' &&
      Array.isArray(fundamentals.annualFinancials) &&
      fundamentals.annualFinancials.length > 1,
  )

const hasQuoteRange = (quote: StockQuote | null) =>
  typeof quote?.fiftyTwoWeekHigh === 'number' && typeof quote.fiftyTwoWeekLow === 'number'

const getQuote = async (c: Context, ticker: string) => {
  const normalizedTicker = normalizeTicker(ticker)
  const cacheKey = `quote:${normalizedTicker}`
  const cached = await getJsonCache<StockQuote>(c.env.KV, cacheKey)
  if (cached && hasQuoteRange(cached)) {
    return cached
  }

  let quote: StockQuote
  try {
    quote = await getFmpQuote(normalizedTicker, c.env.FMP_API_KEY)
  } catch {
    try {
      quote = await getYahooQuote(c.env.YAHOO_FINANCE_BASE_URL, normalizedTicker)
    } catch {
      quote = await getStooqQuote(normalizedTicker)
    }
  }

  await putJsonCache(c.env.KV, cacheKey, quote, CacheTtl.quote)
  return quote
}

const seedSnapshotFromLegacyTables = async (c: Context, ticker: string) => {
  const normalizedTicker = normalizeTicker(ticker)
  const existingSnapshot = await getCompanySnapshotByTicker(c.env.DB, normalizedTicker)
  if (existingSnapshot) {
    return existingSnapshot
  }

  const [company, fundamentals] = await Promise.all([
    getCompanyByTicker(c.env.DB, normalizedTicker),
    getFundamentalsByTicker(c.env.DB, normalizedTicker),
  ])

  if (!company && !fundamentals) {
    return null
  }

  return upsertCompanySnapshot(c.env.DB, {
    ticker: normalizedTicker,
    company,
    fundamentals,
    companyFetchedAt: company?.lastSyncedAt ?? company?.createdAt ?? null,
    fundamentalsFetchedAt: fundamentals?.createdAt ?? fundamentals?.recordedDate ?? null,
  })
}

const resolveCompanySnapshot = async (c: Context, ticker: string) => {
  const normalizedTicker = normalizeTicker(ticker)
  let snapshot = await seedSnapshotFromLegacyTables(c, normalizedTicker)
  let company = snapshot?.company ?? null
  let fundamentals = snapshot?.fundamentals ?? null
  let companyFetchedAt = snapshot?.companyFetchedAt ?? null
  let fundamentalsFetchedAt = snapshot?.fundamentalsFetchedAt ?? null

  if (!company || !isFresh(companyFetchedAt) || !hasCompanyDisplayFields(company)) {
    try {
      const fmpCompany = await getFmpCompanyProfile(normalizedTicker, c.env.FMP_API_KEY)
      if (fmpCompany) {
        company = fmpCompany
        companyFetchedAt = nowIso()
        await upsertCompany(c.env.DB, fmpCompany)
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          company,
          companyFetchedAt,
        })
      }
    } catch {
      try {
        const secProfile = await getSecCompanyProfile(normalizedTicker)
        if (secProfile) {
          company = secProfile.company
          companyFetchedAt = nowIso()
          await upsertCompany(c.env.DB, secProfile.company)
          snapshot = await upsertCompanySnapshot(c.env.DB, {
            ticker: normalizedTicker,
            company,
            companyFetchedAt,
          })
        }
      } catch {
        // Keep stale D1 data if providers are unavailable.
      }
    }
  }

  if (snapshot) {
    company = snapshot.company ?? company
    fundamentals = snapshot.fundamentals ?? fundamentals
    companyFetchedAt = snapshot.companyFetchedAt ?? companyFetchedAt
    fundamentalsFetchedAt = snapshot.fundamentalsFetchedAt ?? fundamentalsFetchedAt
  }

  if (
    company &&
    (!fundamentals || !isFresh(fundamentalsFetchedAt) || !hasSnapshotFundamentals(fundamentals))
  ) {
    try {
      const fmpFundamentals = await getFmpFundamentals(
        company.id,
        normalizedTicker,
        c.env.FMP_API_KEY,
      )
      fundamentals = fmpFundamentals
      fundamentalsFetchedAt = nowIso()
      await upsertFundamentals(c.env.DB, fmpFundamentals)
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        fundamentals,
        fundamentalsFetchedAt,
      })
    } catch {
      try {
        const secProfile = await getSecCompanyProfile(normalizedTicker)
        if (secProfile) {
          const secFundamentals = await getSecFundamentals(company.id, secProfile.cik)
          fundamentals = secFundamentals
          fundamentalsFetchedAt = nowIso()
          await upsertFundamentals(c.env.DB, secFundamentals)
          snapshot = await upsertCompanySnapshot(c.env.DB, {
            ticker: normalizedTicker,
            fundamentals,
            fundamentalsFetchedAt,
          })
        }
      } catch {
        // Keep stale D1 data if providers are unavailable.
      }
    }
  }

  let quote: StockQuote | null = null
  let quoteFetchedAt: string | null = null
  if (company || fundamentals) {
    snapshot = await replaceCompanySnapshot(c.env.DB, {
      ticker: normalizedTicker,
      company,
      fundamentals,
      companyFetchedAt,
      fundamentalsFetchedAt,
    })
    company = snapshot?.company ?? company
    fundamentals = snapshot?.fundamentals ?? fundamentals
    companyFetchedAt = snapshot?.companyFetchedAt ?? companyFetchedAt
    fundamentalsFetchedAt = snapshot?.fundamentalsFetchedAt ?? fundamentalsFetchedAt
  }

  try {
    quote = await getQuote(c, normalizedTicker)
    quoteFetchedAt = quote.marketTime ?? nowIso()
  } catch {
    quote = null
  }

  const freshness = {
    company: freshnessFor(Boolean(company), companyFetchedAt),
    fundamentals: freshnessFor(Boolean(fundamentals), fundamentalsFetchedAt),
    quote: quote ? ('fresh' as const) : ('missing' as const),
  }
  const missing = [
    ...(!company ? ['company' as const] : []),
    ...(!fundamentals ? ['fundamentals' as const] : []),
    ...(!quote ? ['quote' as const] : []),
  ]

  return {
    ticker: normalizedTicker,
    company,
    fundamentals,
    quote,
    fetchedAt: {
      company: companyFetchedAt,
      fundamentals: fundamentalsFetchedAt,
      quote: quoteFetchedAt,
    },
    freshness,
    missing,
  }
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

companies.get('/:ticker/snapshot', zValidator('param', tickerSchema, validatorHook), async (c) => {
  const { ticker } = c.req.valid('param')
  const normalizedTicker = normalizeTicker(ticker)
  c.executionCtx.waitUntil(logUsage(c, 'COMPANY_SNAPSHOT', normalizedTicker).catch(() => undefined))

  const snapshot = await resolveCompanySnapshot(c, normalizedTicker)
  if (!snapshot.company && !snapshot.fundamentals && !snapshot.quote) {
    return c.json(createError('COMPANY_DATA_NOT_FOUND', 'Company data not found'), 404)
  }

  return c.json(createSuccess(snapshot))
})

companies.get('/:ticker', zValidator('param', tickerSchema, validatorHook), async (c) => {
  const { ticker } = c.req.valid('param')
  const normalizedTicker = normalizeTicker(ticker)
  const cacheKey = `company:${normalizedTicker}`

  const cached = await getJsonCache<Company>(c.env.KV, cacheKey)
  if (cached) {
    return c.json(createSuccess(cached))
  }

  const snapshot = await resolveCompanySnapshot(c, normalizedTicker)
  if (!snapshot.company) {
    return c.json(createError('COMPANY_NOT_FOUND', 'Company not found'), 404)
  }

  await putJsonCache(c.env.KV, cacheKey, snapshot.company, CacheTtl.company)
  return c.json(createSuccess(snapshot.company))
})

companies.get(
  '/:ticker/fundamentals',
  zValidator('param', tickerSchema, validatorHook),
  async (c) => {
    const { ticker } = c.req.valid('param')
    const normalizedTicker = normalizeTicker(ticker)
    const cacheKey = `fundamentals:${normalizedTicker}`

    const cached = await getJsonCache<CompanyFundamentals>(c.env.KV, cacheKey)
    if (cached) {
      return c.json(createSuccess(cached))
    }

    const snapshot = await resolveCompanySnapshot(c, normalizedTicker)
    if (!snapshot.fundamentals) {
      return c.json(createError('FUNDAMENTALS_NOT_FOUND', 'Fundamentals not found'), 404)
    }

    await putJsonCache(c.env.KV, cacheKey, snapshot.fundamentals, CacheTtl.fundamentals)
    return c.json(createSuccess(snapshot.fundamentals))
  },
)

export default companies
