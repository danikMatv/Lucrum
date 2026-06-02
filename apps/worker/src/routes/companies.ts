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
import {
  AlphaVantageRateLimitError,
  getAlphaVantageEarnings,
  getAlphaVantageEpsTTM,
  getAlphaVantageIncomeHistory,
  getAlphaVantageOverview,
  type AlphaVantageOverview,
} from '../services/alphavantage'
import { CacheTtl, getJsonCache, putJsonCache } from '../services/cache'
import {
  getFmpCompanyProfile,
  getFmpEpsHistory,
  getFmpFundamentals,
  getFmpIncomeHistory,
  getFmpQuote,
  searchFmpCompanies,
} from '../services/fmp'
import {
  FinnhubRateLimitError,
  getFinnhubBasicFinancials,
  getFinnhubCompanyProfile,
  getFinnhubQuote,
  type FinnhubCompanyProfile,
} from '../services/finnhub'
import { getStooqQuote } from '../services/stooq'
import { getSecCompanyProfile, getSecFundamentals } from '../services/sec'
import { getYahooQuote, type StockQuote } from '../services/yahoo'
import type {
  AppEnv,
  Company,
  CompanyEpsHistoryRow,
  CompanyFundamentals,
  CompanyIncomeHistoryRow,
} from '../types'
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
      (typeof fundamentals.priceToSales === 'number' ||
        typeof fundamentals.forwardPE === 'number' ||
        typeof fundamentals.netMargin === 'number' ||
        typeof fundamentals.beta === 'number'),
  )

const hasIncomeHistory = (incomeHistory: CompanyIncomeHistoryRow[]) => incomeHistory.length > 1

const hasEpsHistory = (epsHistory: CompanyEpsHistoryRow[]) => epsHistory.length > 1

const hasQuotePrice = (quote: StockQuote | null) =>
  typeof quote?.price === 'number' && Number.isFinite(quote.price)

const hasSecret = (value: string | undefined) => typeof value === 'string' && value.trim() !== ''

const providerErrorCode = (error: unknown) => {
  if (error instanceof FinnhubRateLimitError) {
    return 'rate_limited'
  }

  if (error instanceof AlphaVantageRateLimitError) {
    const message = error.message.toLowerCase()
    if (message.includes('frequency') || message.includes('minute')) {
      return 'frequency_limited'
    }
    if (message.includes('rate limit') || message.includes('25 requests')) {
      return 'rate_limited'
    }
    if (message.includes('api key') || message.includes('apikey')) {
      return 'api_key_rejected'
    }

    return 'provider_information'
  }

  if (!(error instanceof Error)) {
    return 'unknown_error'
  }

  if (error.message === 'missing_api_key') {
    return 'missing_key'
  }

  if (error.message.includes('request failed with')) {
    const status = error.message.match(/with (\d{3})/)?.[1]
    return status ? `http_${status}` : 'http_error'
  }

  if (error.message.includes('returned no')) {
    return 'empty_response'
  }

  if (error.name === 'TypeError') {
    return 'network_error'
  }

  return 'unknown_error'
}

const getQuote = async (
  c: Context,
  ticker: string,
  noteProviderIssue?: (provider: string, section: string, error: unknown) => void,
) => {
  const normalizedTicker = normalizeTicker(ticker)
  const cacheKey = `quote:${normalizedTicker}`
  const cached = await getJsonCache<StockQuote>(c.env.KV, cacheKey)
  if (cached && hasQuotePrice(cached)) {
    return cached
  }

  let quote: StockQuote
  try {
    if (!hasSecret(c.env.FINNHUB_API_KEY)) {
      throw new Error('missing_api_key')
    }
    quote = await getFinnhubQuote(normalizedTicker, c.env.FINNHUB_API_KEY)
  } catch (error) {
    noteProviderIssue?.('finnhub', 'quote', error)
    try {
      quote = await getYahooQuote(c.env.YAHOO_FINANCE_BASE_URL, normalizedTicker)
    } catch (error) {
      noteProviderIssue?.('yahoo', 'quote', error)
      try {
        quote = await getFmpQuote(normalizedTicker, c.env.FMP_API_KEY)
      } catch (error) {
        noteProviderIssue?.('fmp', 'quote', error)
        quote = await getStooqQuote(normalizedTicker)
      }
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

const resolveCompanySnapshot = async (
  c: Context,
  ticker: string,
  options: { debugProviders?: boolean } = {},
) => {
  const normalizedTicker = normalizeTicker(ticker)
  const providerDiagnostics: string[] = []
  let snapshot = await seedSnapshotFromLegacyTables(c, normalizedTicker)
  let company = snapshot?.company ?? null
  let fundamentals = snapshot?.fundamentals ?? null
  let incomeHistory = snapshot?.incomeHistory ?? []
  let epsHistory = snapshot?.epsHistory ?? []
  let companyFetchedAt = snapshot?.companyFetchedAt ?? null
  let fundamentalsFetchedAt = snapshot?.fundamentalsFetchedAt ?? null
  let incomeFetchedAt = snapshot?.incomeFetchedAt ?? null
  let epsHistoryFetchedAt = snapshot?.epsHistoryFetchedAt ?? null
  let finnhubProfile: FinnhubCompanyProfile | null = null
  let finnhubProfileError: unknown = null
  let alphaOverview: AlphaVantageOverview | null = null
  let alphaOverviewError: unknown = null

  const getFinnhubProfile = async () => {
    if (finnhubProfileError) {
      throw finnhubProfileError
    }

    if (!finnhubProfile) {
      if (!hasSecret(c.env.FINNHUB_API_KEY)) {
        throw new Error('missing_api_key')
      }
      try {
        finnhubProfile = await getFinnhubCompanyProfile(
          normalizedTicker,
          c.env.FINNHUB_API_KEY,
        )
      } catch (error) {
        finnhubProfileError = error
        throw error
      }
    }

    return finnhubProfile
  }

  const getOverview = async () => {
    if (alphaOverviewError) {
      throw alphaOverviewError
    }

    if (!alphaOverview) {
      if (!hasSecret(c.env.ALPHA_VANTAGE_API_KEY)) {
        throw new Error('missing_api_key')
      }
      try {
        alphaOverview = await getAlphaVantageOverview(
          normalizedTicker,
          c.env.ALPHA_VANTAGE_API_KEY,
        )
      } catch (error) {
        alphaOverviewError = error
        throw error
      }
    }

    return alphaOverview
  }

  const noteProviderIssue = (provider: string, section: string, error: unknown) => {
    if (options.debugProviders) {
      providerDiagnostics.push(`${provider}.${section}.${providerErrorCode(error)}`)
    }
  }

  const withCompanyIdentity = (nextCompany: Company) => ({
    ...nextCompany,
    id: company?.id ?? nextCompany.id,
    createdAt: company?.createdAt ?? nextCompany.createdAt,
  })

  const withFundamentalsCompany = (nextFundamentals: CompanyFundamentals) => ({
    ...nextFundamentals,
    companyId: company?.id ?? nextFundamentals.companyId,
  })

  const mergeFundamentals = (
    primary: CompanyFundamentals,
    fallback: CompanyFundamentals | null,
  ): CompanyFundamentals => {
    if (!fallback) {
      return primary
    }

    return {
      ...primary,
      freeCashFlow: primary.freeCashFlow ?? fallback.freeCashFlow,
      debtToEquity: primary.debtToEquity ?? fallback.debtToEquity,
      netIncome: primary.netIncome ?? fallback.netIncome,
      fiftyTwoWeekHigh: primary.fiftyTwoWeekHigh ?? fallback.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: primary.fiftyTwoWeekLow ?? fallback.fiftyTwoWeekLow,
    }
  }

  if (!company || !isFresh(companyFetchedAt) || !hasCompanyDisplayFields(company)) {
    try {
      const profile = await getFinnhubProfile()
      const finnhubCompany = withCompanyIdentity(profile.company)
      company = finnhubCompany
      companyFetchedAt = nowIso()
      await upsertCompany(c.env.DB, finnhubCompany)
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        company,
        companyFetchedAt,
      })
    } catch (error) {
      noteProviderIssue('finnhub', 'company', error)
      try {
        const overview = await getOverview()
        const alphaCompany = withCompanyIdentity(overview.company)
        company = alphaCompany
        companyFetchedAt = nowIso()
        await upsertCompany(c.env.DB, alphaCompany)
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          company,
          companyFetchedAt,
        })
      } catch (error) {
        noteProviderIssue('alphaVantage', 'company', error)
        try {
          const fmpCompany = await getFmpCompanyProfile(normalizedTicker, c.env.FMP_API_KEY)
          if (fmpCompany) {
            company = withCompanyIdentity(fmpCompany)
            companyFetchedAt = nowIso()
            await upsertCompany(c.env.DB, company)
            snapshot = await upsertCompanySnapshot(c.env.DB, {
              ticker: normalizedTicker,
              company,
              companyFetchedAt,
            })
          }
        } catch (error) {
          noteProviderIssue('fmp', 'company', error)
          try {
            const secProfile = await getSecCompanyProfile(normalizedTicker)
            if (secProfile) {
              company = withCompanyIdentity(secProfile.company)
              companyFetchedAt = nowIso()
              await upsertCompany(c.env.DB, company)
              snapshot = await upsertCompanySnapshot(c.env.DB, {
                ticker: normalizedTicker,
                company,
                companyFetchedAt,
              })
            }
          } catch (error) {
            noteProviderIssue('sec', 'company', error)
            // Keep stale D1 data if providers are unavailable.
          }
        }
      }
    }
  }

  if (snapshot) {
    company = snapshot.company ?? company
    fundamentals = snapshot.fundamentals ?? fundamentals
    incomeHistory = snapshot.incomeHistory.length > 0 ? snapshot.incomeHistory : incomeHistory
    epsHistory = snapshot.epsHistory.length > 0 ? snapshot.epsHistory : epsHistory
    companyFetchedAt = snapshot.companyFetchedAt ?? companyFetchedAt
    fundamentalsFetchedAt = snapshot.fundamentalsFetchedAt ?? fundamentalsFetchedAt
    incomeFetchedAt = snapshot.incomeFetchedAt ?? incomeFetchedAt
    epsHistoryFetchedAt = snapshot.epsHistoryFetchedAt ?? epsHistoryFetchedAt
  }

  if (
    company &&
    (!fundamentals || !isFresh(fundamentalsFetchedAt) || !hasSnapshotFundamentals(fundamentals))
  ) {
    try {
      const profile = await getFinnhubProfile()
      let finnhubFundamentals = withFundamentalsCompany(
        await getFinnhubBasicFinancials(
          company.id,
          normalizedTicker,
          c.env.FINNHUB_API_KEY,
          profile,
        ),
      )

      try {
        const fmpSupplement = await getFmpFundamentals(
          company.id,
          normalizedTicker,
          c.env.FMP_API_KEY,
        )
        finnhubFundamentals = mergeFundamentals(finnhubFundamentals, fmpSupplement)
      } catch (error) {
        noteProviderIssue('fmp', 'fundamentalsSupplement', error)
        // Finnhub remains primary; FMP only fills optional gaps.
      }

      fundamentals = finnhubFundamentals
      fundamentalsFetchedAt = nowIso()
      await upsertFundamentals(c.env.DB, fundamentals)
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        fundamentals,
        fundamentalsFetchedAt,
      })
    } catch (error) {
      noteProviderIssue('finnhub', 'fundamentals', error)
      try {
        const overview = await getOverview()
        let alphaFundamentals = withFundamentalsCompany(overview.fundamentals)

        try {
          const epsTtm = await getAlphaVantageEpsTTM(
            normalizedTicker,
            c.env.ALPHA_VANTAGE_API_KEY,
          )
          alphaFundamentals = {
            ...alphaFundamentals,
            epsTtm: epsTtm ?? alphaFundamentals.epsTtm,
          }
        } catch (error) {
          noteProviderIssue('alphaVantage', 'epsTtm', error)
          // Keep OVERVIEW EPS fallback if quarterly EARNINGS is unavailable.
        }

        try {
          const fmpSupplement = await getFmpFundamentals(
            company.id,
            normalizedTicker,
            c.env.FMP_API_KEY,
          )
          alphaFundamentals = mergeFundamentals(alphaFundamentals, fmpSupplement)
        } catch (error) {
          noteProviderIssue('fmp', 'fundamentalsSupplement', error)
          // Alpha Vantage remains the first fallback; FMP only fills optional gaps.
        }

        fundamentals = alphaFundamentals
        fundamentalsFetchedAt = nowIso()
        await upsertFundamentals(c.env.DB, fundamentals)
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          fundamentals,
          fundamentalsFetchedAt,
        })
      } catch (error) {
        noteProviderIssue('alphaVantage', 'fundamentals', error)
        try {
          const fmpFundamentals = await getFmpFundamentals(
            company.id,
            normalizedTicker,
            c.env.FMP_API_KEY,
          )
          fundamentals = withFundamentalsCompany(fmpFundamentals)
          fundamentalsFetchedAt = nowIso()
          await upsertFundamentals(c.env.DB, fundamentals)
          snapshot = await upsertCompanySnapshot(c.env.DB, {
            ticker: normalizedTicker,
            fundamentals,
            fundamentalsFetchedAt,
          })
        } catch (error) {
          noteProviderIssue('fmp', 'fundamentals', error)
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
          } catch (error) {
            noteProviderIssue('sec', 'fundamentals', error)
            // Keep stale D1 data if providers are unavailable.
          }
        }
      }
    }
  }
  if (!isFresh(incomeFetchedAt) || !hasIncomeHistory(incomeHistory)) {
    try {
      if (alphaOverviewError) {
        throw alphaOverviewError
      }

      incomeHistory = await getAlphaVantageIncomeHistory(
        normalizedTicker,
        c.env.ALPHA_VANTAGE_API_KEY,
      )
      incomeFetchedAt = nowIso()
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        incomeHistory,
        incomeFetchedAt,
      })
    } catch (error) {
      noteProviderIssue('alphaVantage', 'incomeHistory', error)
      try {
        incomeHistory = await getFmpIncomeHistory(normalizedTicker, c.env.FMP_API_KEY)
        incomeFetchedAt = nowIso()
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          incomeHistory,
          incomeFetchedAt,
        })
      } catch (error) {
        noteProviderIssue('fmp', 'incomeHistory', error)
        // Keep stale D1 income history if providers are unavailable.
      }
    }
  }

  if (!isFresh(epsHistoryFetchedAt) || !hasEpsHistory(epsHistory)) {
    try {
      if (!hasSecret(c.env.ALPHA_VANTAGE_API_KEY)) {
        throw new Error('missing_api_key')
      }

      epsHistory = await getAlphaVantageEarnings(normalizedTicker, c.env.ALPHA_VANTAGE_API_KEY)
      epsHistoryFetchedAt = nowIso()
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        epsHistory,
        epsHistoryFetchedAt,
      })
    } catch (error) {
      noteProviderIssue('alphaVantage', 'epsHistory', error)
      try {
        epsHistory = await getFmpEpsHistory(normalizedTicker, c.env.FMP_API_KEY)
        epsHistoryFetchedAt = nowIso()
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          epsHistory,
          epsHistoryFetchedAt,
        })
      } catch (error) {
        noteProviderIssue('fmp', 'epsHistory', error)
        // Keep stale D1 EPS history if providers are unavailable.
      }
    }
  }

  let quote: StockQuote | null = null
  let quoteFetchedAt: string | null = null
  if (company || fundamentals || incomeHistory.length > 0 || epsHistory.length > 0) {
    snapshot = await replaceCompanySnapshot(c.env.DB, {
      ticker: normalizedTicker,
      company,
      fundamentals,
      incomeHistory,
      epsHistory,
      companyFetchedAt,
      fundamentalsFetchedAt,
      incomeFetchedAt,
      epsHistoryFetchedAt,
    })
    company = snapshot?.company ?? company
    fundamentals = snapshot?.fundamentals ?? fundamentals
    incomeHistory = snapshot?.incomeHistory ?? incomeHistory
    epsHistory = snapshot?.epsHistory ?? epsHistory
    companyFetchedAt = snapshot?.companyFetchedAt ?? companyFetchedAt
    fundamentalsFetchedAt = snapshot?.fundamentalsFetchedAt ?? fundamentalsFetchedAt
    incomeFetchedAt = snapshot?.incomeFetchedAt ?? incomeFetchedAt
    epsHistoryFetchedAt = snapshot?.epsHistoryFetchedAt ?? epsHistoryFetchedAt
  }

  try {
    quote = await getQuote(c, normalizedTicker, noteProviderIssue)
    quoteFetchedAt = quote.marketTime ?? nowIso()
  } catch (error) {
    noteProviderIssue('quote', 'live', error)
    quote = null
  }

  const freshness = {
    company: freshnessFor(Boolean(company), companyFetchedAt),
    fundamentals: freshnessFor(Boolean(fundamentals), fundamentalsFetchedAt),
    incomeHistory: freshnessFor(hasIncomeHistory(incomeHistory), incomeFetchedAt),
    epsHistory: freshnessFor(hasEpsHistory(epsHistory), epsHistoryFetchedAt),
    quote: quote ? ('fresh' as const) : ('missing' as const),
  }
  const missing = [
    ...(!company ? ['company'] : []),
    ...(!fundamentals ? ['fundamentals'] : []),
    ...(fundamentals && typeof fundamentals.peRatio !== 'number' ? ['peRatio'] : []),
    ...(fundamentals && typeof fundamentals.marketCap !== 'number' ? ['marketCap'] : []),
    ...(!hasIncomeHistory(incomeHistory) ? ['incomeHistory'] : []),
    ...(!hasEpsHistory(epsHistory) ? ['epsHistory'] : []),
    ...(!quote ? ['quote'] : []),
  ]

  return {
    ticker: normalizedTicker,
    company,
    fundamentals,
    incomeHistory,
    epsHistory,
    quote,
    fetchedAt: {
      company: companyFetchedAt,
      fundamentals: fundamentalsFetchedAt,
      incomeHistory: incomeFetchedAt,
      epsHistory: epsHistoryFetchedAt,
      quote: quoteFetchedAt,
    },
    freshness,
    missing,
    ...(options.debugProviders ? { providerDiagnostics } : {}),
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
  const debugProviders = c.req.query('debugProviders') === '1'
  c.executionCtx.waitUntil(logUsage(c, 'COMPANY_SNAPSHOT', normalizedTicker).catch(() => undefined))

  const snapshot = await resolveCompanySnapshot(c, normalizedTicker, { debugProviders })
  if (
    !snapshot.company &&
    !snapshot.fundamentals &&
    snapshot.incomeHistory.length === 0 &&
    snapshot.epsHistory.length === 0 &&
    !snapshot.quote
  ) {
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
