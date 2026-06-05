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
  FinnhubBasicFinancialsError,
  FinnhubRateLimitError,
  getFinnhubBasicFinancials,
  getFinnhubCompanyProfile,
  getFinnhubQuote,
  type FinnhubBasicFinancialsDebug,
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

type FundamentalsSourceProvider = NonNullable<CompanyFundamentals['sourceProvider']>

const hasSnapshotFundamentals = (
  fundamentals: CompanyFundamentals | null,
  options: { requireFinnhubSource?: boolean } = {},
) =>
  Boolean(
    fundamentals &&
      typeof fundamentals.peRatio === 'number' &&
      typeof fundamentals.marketCap === 'number' &&
      (!options.requireFinnhubSource || fundamentals.sourceProvider === 'finnhub') &&
      (typeof fundamentals.priceToSales === 'number' ||
        typeof fundamentals.forwardPE === 'number' ||
        typeof fundamentals.netMargin === 'number' ||
        typeof fundamentals.beta === 'number'),
  )

const hasIncomeHistory = (incomeHistory: CompanyIncomeHistoryRow[]) => incomeHistory.length > 1

const hasEpsHistory = (epsHistory: CompanyEpsHistoryRow[]) => epsHistory.length > 1

const hasQuotePrice = (quote: StockQuote | null) =>
  typeof quote?.price === 'number' && Number.isFinite(quote.price)

const hasQuoteRange = (quote: StockQuote | null) =>
  Boolean(
    quote &&
      typeof quote.fiftyTwoWeekHigh === 'number' &&
      typeof quote.fiftyTwoWeekLow === 'number',
  )

const hasSecret = (value: string | undefined) => typeof value === 'string' && value.trim() !== ''

const mergeQuote = (primary: StockQuote, fallback: StockQuote): StockQuote => ({
  ...primary,
  currency: primary.currency ?? fallback.currency,
  marketTime: primary.marketTime ?? fallback.marketTime,
  fiftyTwoWeekHigh: primary.fiftyTwoWeekHigh ?? fallback.fiftyTwoWeekHigh,
  fiftyTwoWeekLow: primary.fiftyTwoWeekLow ?? fallback.fiftyTwoWeekLow,
  change: primary.change ?? fallback.change,
  changePercent: primary.changePercent ?? fallback.changePercent,
  dayHigh: primary.dayHigh ?? fallback.dayHigh,
  dayLow: primary.dayLow ?? fallback.dayLow,
  previousClose: primary.previousClose ?? fallback.previousClose,
  shortName: primary.shortName ?? fallback.shortName,
  longName: primary.longName ?? fallback.longName,
  exchangeName: primary.exchangeName ?? fallback.exchangeName,
  quoteType: primary.quoteType ?? fallback.quoteType,
})

const enrichQuote = async (
  quote: StockQuote,
  c: Context,
  ticker: string,
  noteProviderIssue?: (provider: string, section: string, error: unknown) => void,
) => {
  if (hasQuoteRange(quote) && quote.longName && quote.quoteType) {
    return quote
  }

  let enrichedQuote = quote
  try {
    const yahooQuote = await getYahooQuote(c.env.YAHOO_FINANCE_BASE_URL, ticker)
    enrichedQuote = mergeQuote(enrichedQuote, yahooQuote)
  } catch (error) {
    noteProviderIssue?.('yahoo', 'quoteSupplement', error)
  }

  if (hasQuoteRange(enrichedQuote)) {
    return enrichedQuote
  }

  try {
    const fmpQuote = await getFmpQuote(ticker, c.env.FMP_API_KEY)
    return mergeQuote(enrichedQuote, fmpQuote)
  } catch (error) {
    noteProviderIssue?.('fmp', 'quoteSupplement', error)
    return enrichedQuote
  }
}

const isFundQuote = (quote: StockQuote | null) => {
  const quoteType = quote?.quoteType?.toLowerCase() ?? ''
  const name = `${quote?.longName ?? ''} ${quote?.shortName ?? ''}`.toLowerCase()
  return (
    quoteType.includes('etf') ||
    quoteType.includes('fund') ||
    name.includes(' etf') ||
    name.includes(' fund') ||
    name.includes('index fund')
  )
}

const createFundSnapshotCompany = (ticker: string, quote: StockQuote): Company => {
  const timestamp = nowIso()
  const instrumentText = `${quote.quoteType ?? ''} ${quote.longName ?? ''} ${
    quote.shortName ?? ''
  }`.toUpperCase()
  const quoteType = instrumentText.includes('ETF') ? 'ETF' : 'Fund'

  return {
    id: crypto.randomUUID(),
    ticker,
    name: quote.longName ?? quote.shortName ?? ticker,
    exchange: quote.exchangeName ?? null,
    sector: quoteType,
    industry: quoteType,
    description: null,
    lastSyncedAt: timestamp,
    createdAt: timestamp,
  }
}

interface EpsTtmDebugEntry {
  stage: string
  source?: string
  provider?: string
  error?: string
  errorName?: string
  errorMessage?: string
  errorStack?: string | null
  epsTtm?: number | null
  rawMetricEpsTTM?: number | string | null
  rawMetricEpsBasicExclExtraItemsTTM?: number | string | null
  mappedEpsTtm?: number | null
  fmpSupplementEpsTtm?: number | null
  alphaEpsTtm?: number | null
  fundamentalsFetchedAt?: string | null
  hasSnapshotFundamentals?: boolean
  isFresh?: boolean
  willRefresh?: boolean
  finnhubKeyPresent?: boolean
  sourceProvider?: CompanyFundamentals['sourceProvider']
}

interface ProviderErrorDebugEntry {
  provider: string
  section: string
  code: string
  name: string
  message: string
  stack: string | null
}

const sanitizeDebugText = (value: string) =>
  value
    .replace(/API key as [A-Za-z0-9_-]+/gi, 'API key as [redacted]')
    .replace(/([?&](?:apikey|token)=)[^&\s]+/gi, '$1[redacted]')

const truncateDebugText = (value: string, maxLength = 900) => {
  const sanitized = sanitizeDebugText(value)
  return sanitized.length > maxLength ? `${sanitized.slice(0, maxLength)}...` : sanitized
}

const describeProviderError = (error: unknown) => {
  if (error instanceof FinnhubBasicFinancialsError) {
    return {
      name: `${error.name}:${error.phase}`,
      message: `${error.message}; original=${error.originalName}: ${error.originalMessage}`,
      stack: error.originalStack ?? error.stack ?? null,
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }
  }

  return {
    name: typeof error,
    message: String(error),
    stack: null,
  }
}

const providerErrorCode = (error: unknown) => {
  if (error instanceof FinnhubRateLimitError) {
    return 'rate_limited'
  }

  if (error instanceof FinnhubBasicFinancialsError) {
    return `basic_financials_${error.phase}_error`
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
    const enrichedCached = await enrichQuote(
      cached,
      c,
      normalizedTicker,
      noteProviderIssue,
    )
    if (enrichedCached !== cached) {
      await putJsonCache(c.env.KV, cacheKey, enrichedCached, CacheTtl.quote)
    }
    return enrichedCached
  }

  let quote: StockQuote
  try {
    if (!hasSecret(c.env.FINNHUB_API_KEY)) {
      throw new Error('missing_api_key')
    }
    quote = await getFinnhubQuote(normalizedTicker, c.env.FINNHUB_API_KEY)
    quote = await enrichQuote(quote, c, normalizedTicker, noteProviderIssue)
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
    return { snapshot: existingSnapshot, source: 'company_snapshots' as const }
  }

  const [company, fundamentals] = await Promise.all([
    getCompanyByTicker(c.env.DB, normalizedTicker),
    getFundamentalsByTicker(c.env.DB, normalizedTicker),
  ])

  if (!company && !fundamentals) {
    return { snapshot: null, source: 'none' as const }
  }

  const snapshot = await upsertCompanySnapshot(c.env.DB, {
    ticker: normalizedTicker,
    company,
    fundamentals,
    companyFetchedAt: company?.lastSyncedAt ?? company?.createdAt ?? null,
    // Legacy fundamentals may come from older providers, so they should not block
    // the current primary-provider refresh path.
    fundamentalsFetchedAt: null,
  })
  return { snapshot, source: 'legacy_tables' as const }
}

const resolveCompanySnapshot = async (
  c: Context,
  ticker: string,
  options: { debugProviders?: boolean } = {},
) => {
  const normalizedTicker = normalizeTicker(ticker)
  const providerDiagnostics: string[] = []
  const providerErrorDetails: ProviderErrorDebugEntry[] = []
  const seededSnapshot = await seedSnapshotFromLegacyTables(c, normalizedTicker)
  const epsTtmDebug: EpsTtmDebugEntry[] = []
  let snapshot = seededSnapshot.snapshot
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
  const requireFinnhubFundamentalsSource = hasSecret(c.env.FINNHUB_API_KEY)

  const traceEps = (entry: EpsTtmDebugEntry) => {
    if (options.debugProviders) {
      epsTtmDebug.push(entry)
    }
  }

  const traceFinnhubBasicDebug = (debug: FinnhubBasicFinancialsDebug) => {
    traceEps({
      stage: 'finnhub.basic.rawMetric',
      rawMetricEpsTTM: debug.rawMetricEpsTTM,
      rawMetricEpsBasicExclExtraItemsTTM: debug.rawMetricEpsBasicExclExtraItemsTTM,
      mappedEpsTtm: debug.mappedEpsTtm,
    })
  }

  const traceProviderError = (stage: string, provider: string, error: unknown) => {
    const detail = describeProviderError(error)
    traceEps({
      stage,
      provider,
      error: providerErrorCode(error),
      errorName: detail.name,
      errorMessage: sanitizeDebugText(detail.message),
      errorStack: detail.stack ? truncateDebugText(detail.stack) : null,
    })
  }

  traceEps({
    stage: 'environment',
    finnhubKeyPresent: hasSecret(c.env.FINNHUB_API_KEY),
  })
  traceEps({
    stage: 'snapshot.seed',
    source: seededSnapshot.source,
    epsTtm: fundamentals?.epsTtm ?? null,
    sourceProvider: fundamentals?.sourceProvider ?? null,
    fundamentalsFetchedAt,
    hasSnapshotFundamentals: hasSnapshotFundamentals(fundamentals, {
      requireFinnhubSource: requireFinnhubFundamentalsSource,
    }),
    isFresh: isFresh(fundamentalsFetchedAt),
  })

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
      const code = providerErrorCode(error)
      const detail = describeProviderError(error)
      const message = truncateDebugText(detail.message.replace(/\s+/g, ' '))
      providerDiagnostics.push(`${provider}.${section}.${code}:${detail.name}:${message}`)
      providerErrorDetails.push({
        provider,
        section,
        code,
        name: detail.name,
        message: sanitizeDebugText(detail.message),
        stack: detail.stack ? truncateDebugText(detail.stack) : null,
      })
    }
  }

  const getOptionalFinnhubProfile = async (section: string) => {
    try {
      return await getFinnhubProfile()
    } catch (error) {
      noteProviderIssue('finnhub', section, error)
      traceProviderError(`finnhub.${section}.error`, 'finnhub', error)
      return null
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

  const withFundamentalsSource = (
    nextFundamentals: CompanyFundamentals,
    sourceProvider: FundamentalsSourceProvider,
  ): CompanyFundamentals => ({
    ...nextFundamentals,
    sourceProvider,
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
      epsTtm: primary.epsTtm ?? fallback.epsTtm,
      revenue: primary.revenue ?? fallback.revenue,
      netIncome: primary.netIncome ?? fallback.netIncome,
      freeCashFlow: primary.freeCashFlow ?? fallback.freeCashFlow,
      peRatio: primary.peRatio ?? fallback.peRatio,
      marketCap: primary.marketCap ?? fallback.marketCap,
      dividendYield: primary.dividendYield ?? fallback.dividendYield,
      debtToEquity: primary.debtToEquity ?? fallback.debtToEquity,
      recordedDate: primary.recordedDate ?? fallback.recordedDate,
      fiftyTwoWeekHigh: primary.fiftyTwoWeekHigh ?? fallback.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: primary.fiftyTwoWeekLow ?? fallback.fiftyTwoWeekLow,
      sharesOutstanding: primary.sharesOutstanding ?? fallback.sharesOutstanding,
      profitMargin: primary.profitMargin ?? fallback.profitMargin,
      priceToSales: primary.priceToSales ?? fallback.priceToSales,
      priceToBook: primary.priceToBook ?? fallback.priceToBook,
      returnOnEquity: primary.returnOnEquity ?? fallback.returnOnEquity,
      returnOnAssets: primary.returnOnAssets ?? fallback.returnOnAssets,
      grossProfit: primary.grossProfit ?? fallback.grossProfit,
      grossMargin: primary.grossMargin ?? fallback.grossMargin,
      operatingMargin: primary.operatingMargin ?? fallback.operatingMargin,
      netMargin: primary.netMargin ?? fallback.netMargin,
      currentRatio: primary.currentRatio ?? fallback.currentRatio,
      quickRatio: primary.quickRatio ?? fallback.quickRatio,
      analystTargetPrice: primary.analystTargetPrice ?? fallback.analystTargetPrice,
      employees: primary.employees ?? fallback.employees,
      country: primary.country ?? fallback.country,
      address: primary.address ?? fallback.address,
      fiscalYearEnd: primary.fiscalYearEnd ?? fallback.fiscalYearEnd,
      latestQuarter: primary.latestQuarter ?? fallback.latestQuarter,
      forwardPE: primary.forwardPE ?? fallback.forwardPE,
      pegRatio: primary.pegRatio ?? fallback.pegRatio,
      beta: primary.beta ?? fallback.beta,
      revenuePerShare: primary.revenuePerShare ?? fallback.revenuePerShare,
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

  const shouldRefreshFundamentals = Boolean(
    company &&
      (!fundamentals ||
        !isFresh(fundamentalsFetchedAt) ||
        !hasSnapshotFundamentals(fundamentals, {
          requireFinnhubSource: requireFinnhubFundamentalsSource,
        })),
  )
  traceEps({
    stage: 'fundamentals.refreshDecision',
    epsTtm: fundamentals?.epsTtm ?? null,
    sourceProvider: fundamentals?.sourceProvider ?? null,
    fundamentalsFetchedAt,
    hasSnapshotFundamentals: hasSnapshotFundamentals(fundamentals, {
      requireFinnhubSource: requireFinnhubFundamentalsSource,
    }),
    isFresh: isFresh(fundamentalsFetchedAt),
    willRefresh: shouldRefreshFundamentals,
  })

  if (options.debugProviders && company && !shouldRefreshFundamentals) {
    try {
      if (!hasSecret(c.env.FINNHUB_API_KEY)) {
        throw new Error('missing_api_key')
      }
      const profile = await getOptionalFinnhubProfile('profileDebugSupplement')
      const debugOnlyFundamentals = withFundamentalsCompany(
        await getFinnhubBasicFinancials(
          company.id,
          normalizedTicker,
          c.env.FINNHUB_API_KEY,
          profile,
          traceFinnhubBasicDebug,
        ),
      )
      traceEps({
        stage: 'finnhub.basic.debugOnly.afterReturn',
        provider: 'finnhub',
        epsTtm: debugOnlyFundamentals.epsTtm,
      })
    } catch (error) {
      noteProviderIssue('finnhub', 'fundamentalsDebug', error)
      traceProviderError('finnhub.basic.debugOnly.error', 'finnhub', error)
    }
  }

  if (company && shouldRefreshFundamentals) {
    try {
      if (!hasSecret(c.env.FINNHUB_API_KEY)) {
        throw new Error('missing_api_key')
      }
      const profile = await getOptionalFinnhubProfile('profileSupplement')
      let finnhubFundamentals = withFundamentalsSource(
        withFundamentalsCompany(
          await getFinnhubBasicFinancials(
            company.id,
            normalizedTicker,
            c.env.FINNHUB_API_KEY,
            profile,
            traceFinnhubBasicDebug,
          ),
        ),
        'finnhub',
      )
      traceEps({
        stage: 'finnhub.basic.afterReturn',
        provider: 'finnhub',
        epsTtm: finnhubFundamentals.epsTtm,
        sourceProvider: finnhubFundamentals.sourceProvider,
      })

      try {
        const fmpSupplement = await getFmpFundamentals(
          company.id,
          normalizedTicker,
          c.env.FMP_API_KEY,
        )
        finnhubFundamentals = mergeFundamentals(finnhubFundamentals, fmpSupplement)
        traceEps({
          stage: 'finnhub.afterFmpSupplement',
          provider: 'finnhub',
          epsTtm: finnhubFundamentals.epsTtm,
          sourceProvider: finnhubFundamentals.sourceProvider,
          fmpSupplementEpsTtm: fmpSupplement.epsTtm,
        })
      } catch (error) {
        noteProviderIssue('fmp', 'fundamentalsSupplement', error)
        // Finnhub remains primary; FMP only fills optional gaps.
      }

      fundamentals = finnhubFundamentals
      fundamentalsFetchedAt = nowIso()
      traceEps({
        stage: 'finnhub.beforeSnapshotUpsert',
        provider: 'finnhub',
        epsTtm: fundamentals.epsTtm,
        sourceProvider: fundamentals.sourceProvider,
        fundamentalsFetchedAt,
      })
      await upsertFundamentals(c.env.DB, fundamentals)
      snapshot = await upsertCompanySnapshot(c.env.DB, {
        ticker: normalizedTicker,
        fundamentals,
        fundamentalsFetchedAt,
      })
      traceEps({
        stage: 'finnhub.afterSnapshotUpsert',
        provider: 'finnhub',
        epsTtm: snapshot?.fundamentals?.epsTtm ?? null,
        sourceProvider: snapshot?.fundamentals?.sourceProvider ?? null,
        fundamentalsFetchedAt: snapshot?.fundamentalsFetchedAt ?? null,
      })
    } catch (error) {
      noteProviderIssue('finnhub', 'fundamentals', error)
      traceProviderError('finnhub.fundamentals.error', 'finnhub', error)
      try {
        const overview = await getOverview()
        let alphaFundamentals = withFundamentalsSource(
          withFundamentalsCompany(overview.fundamentals),
          'alphaVantage',
        )
        traceEps({
          stage: 'alphaVantage.afterOverview',
          provider: 'alphaVantage',
          epsTtm: alphaFundamentals.epsTtm,
          sourceProvider: alphaFundamentals.sourceProvider,
        })

        try {
          const epsTtm = await getAlphaVantageEpsTTM(
            normalizedTicker,
            c.env.ALPHA_VANTAGE_API_KEY,
          )
          alphaFundamentals = {
            ...alphaFundamentals,
            epsTtm: epsTtm ?? alphaFundamentals.epsTtm,
          }
          traceEps({
            stage: 'alphaVantage.afterEpsTtm',
            provider: 'alphaVantage',
            epsTtm: alphaFundamentals.epsTtm,
            sourceProvider: alphaFundamentals.sourceProvider,
            alphaEpsTtm: epsTtm,
          })
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
          traceEps({
            stage: 'alphaVantage.afterFmpSupplement',
            provider: 'alphaVantage',
            epsTtm: alphaFundamentals.epsTtm,
            sourceProvider: alphaFundamentals.sourceProvider,
            fmpSupplementEpsTtm: fmpSupplement.epsTtm,
          })
        } catch (error) {
          noteProviderIssue('fmp', 'fundamentalsSupplement', error)
          // Alpha Vantage remains the first fallback; FMP only fills optional gaps.
        }

        fundamentals = alphaFundamentals
        fundamentalsFetchedAt = nowIso()
        traceEps({
          stage: 'alphaVantage.beforeSnapshotUpsert',
          provider: 'alphaVantage',
          epsTtm: fundamentals.epsTtm,
          sourceProvider: fundamentals.sourceProvider,
          fundamentalsFetchedAt,
        })
        await upsertFundamentals(c.env.DB, fundamentals)
        snapshot = await upsertCompanySnapshot(c.env.DB, {
          ticker: normalizedTicker,
          fundamentals,
          fundamentalsFetchedAt,
        })
        traceEps({
          stage: 'alphaVantage.afterSnapshotUpsert',
          provider: 'alphaVantage',
          epsTtm: snapshot?.fundamentals?.epsTtm ?? null,
          sourceProvider: snapshot?.fundamentals?.sourceProvider ?? null,
          fundamentalsFetchedAt: snapshot?.fundamentalsFetchedAt ?? null,
        })
      } catch (error) {
        noteProviderIssue('alphaVantage', 'fundamentals', error)
        try {
          const fmpFundamentals = await getFmpFundamentals(
            company.id,
            normalizedTicker,
            c.env.FMP_API_KEY,
          )
          fundamentals = withFundamentalsSource(withFundamentalsCompany(fmpFundamentals), 'fmp')
          fundamentalsFetchedAt = nowIso()
          traceEps({
            stage: 'fmp.beforeSnapshotUpsert',
            provider: 'fmp',
            epsTtm: fundamentals.epsTtm,
            sourceProvider: fundamentals.sourceProvider,
            fundamentalsFetchedAt,
          })
          await upsertFundamentals(c.env.DB, fundamentals)
          snapshot = await upsertCompanySnapshot(c.env.DB, {
            ticker: normalizedTicker,
            fundamentals,
            fundamentalsFetchedAt,
          })
          traceEps({
            stage: 'fmp.afterSnapshotUpsert',
            provider: 'fmp',
            epsTtm: snapshot?.fundamentals?.epsTtm ?? null,
            sourceProvider: snapshot?.fundamentals?.sourceProvider ?? null,
            fundamentalsFetchedAt: snapshot?.fundamentalsFetchedAt ?? null,
          })
        } catch (error) {
          noteProviderIssue('fmp', 'fundamentals', error)
          try {
            const secProfile = await getSecCompanyProfile(normalizedTicker)
            if (secProfile) {
              const secFundamentals = await getSecFundamentals(company.id, secProfile.cik)
              fundamentals = withFundamentalsSource(secFundamentals, 'sec')
              fundamentalsFetchedAt = nowIso()
              traceEps({
                stage: 'sec.beforeSnapshotUpsert',
                provider: 'sec',
                epsTtm: fundamentals.epsTtm,
                sourceProvider: fundamentals.sourceProvider,
                fundamentalsFetchedAt,
              })
              await upsertFundamentals(c.env.DB, secFundamentals)
              snapshot = await upsertCompanySnapshot(c.env.DB, {
                ticker: normalizedTicker,
                fundamentals,
                fundamentalsFetchedAt,
              })
              traceEps({
                stage: 'sec.afterSnapshotUpsert',
                provider: 'sec',
                epsTtm: snapshot?.fundamentals?.epsTtm ?? null,
                sourceProvider: snapshot?.fundamentals?.sourceProvider ?? null,
                fundamentalsFetchedAt: snapshot?.fundamentalsFetchedAt ?? null,
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
    traceEps({
      stage: 'snapshot.replace.beforeSave',
      epsTtm: fundamentals?.epsTtm ?? null,
      sourceProvider: fundamentals?.sourceProvider ?? null,
      fundamentalsFetchedAt,
    })
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
    traceEps({
      stage: 'snapshot.replace.afterRead',
      epsTtm: fundamentals?.epsTtm ?? null,
      sourceProvider: fundamentals?.sourceProvider ?? null,
      fundamentalsFetchedAt,
    })
  }

  try {
    quote = await getQuote(c, normalizedTicker, noteProviderIssue)
    quoteFetchedAt = quote.marketTime ?? nowIso()
  } catch (error) {
    noteProviderIssue('quote', 'live', error)
    quote = null
  }

  if (quote && isFundQuote(quote) && (!company || !hasCompanyDisplayFields(company))) {
    company = {
      ...createFundSnapshotCompany(normalizedTicker, quote),
      id: company?.id ?? crypto.randomUUID(),
      createdAt: company?.createdAt ?? nowIso(),
    }
    companyFetchedAt = nowIso()
    snapshot = await upsertCompanySnapshot(c.env.DB, {
      ticker: normalizedTicker,
      company,
      companyFetchedAt,
    })
    company = snapshot?.company ?? company
    companyFetchedAt = snapshot?.companyFetchedAt ?? companyFetchedAt
  }

  const companyInstrumentType = company?.sector?.toLowerCase() ?? ''
  const fundLikeInstrument =
    isFundQuote(quote) ||
    companyInstrumentType.includes('etf') ||
    companyInstrumentType.includes('fund')
  const freshness = {
    company: freshnessFor(Boolean(company), companyFetchedAt),
    fundamentals: freshnessFor(Boolean(fundamentals), fundamentalsFetchedAt),
    incomeHistory: freshnessFor(hasIncomeHistory(incomeHistory), incomeFetchedAt),
    epsHistory: freshnessFor(hasEpsHistory(epsHistory), epsHistoryFetchedAt),
    quote: quote ? ('fresh' as const) : ('missing' as const),
  }
  const missing = [
    ...(!company ? ['company'] : []),
    ...(!fundLikeInstrument && !fundamentals ? ['fundamentals'] : []),
    ...(fundamentals && typeof fundamentals.peRatio !== 'number' ? ['peRatio'] : []),
    ...(fundamentals && typeof fundamentals.marketCap !== 'number' ? ['marketCap'] : []),
    ...(!fundLikeInstrument && !hasIncomeHistory(incomeHistory) ? ['incomeHistory'] : []),
    ...(!fundLikeInstrument && !hasEpsHistory(epsHistory) ? ['epsHistory'] : []),
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
    ...(options.debugProviders ? { providerDiagnostics, providerErrorDetails, epsTtmDebug } : {}),
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
