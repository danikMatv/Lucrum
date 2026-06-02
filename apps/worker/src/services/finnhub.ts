import type { Company, CompanyEpsHistoryRow, CompanyFundamentals } from '../types'
import type { StockQuote } from './yahoo'

interface FinnhubCompanyProfileResponse {
  country?: string | null
  currency?: string | null
  exchange?: string | null
  finnhubIndustry?: string | null
  ipo?: string | null
  marketCapitalization?: number | string | null
  name?: string | null
  shareOutstanding?: number | string | null
  ticker?: string | null
  weburl?: string | null
}

type FinnhubMetricValue = number | string | null | undefined

interface FinnhubBasicFinancialsResponse {
  metric?: Record<string, FinnhubMetricValue>
  metricType?: string
  symbol?: string
}

interface FinnhubEarningsResponse {
  actual?: number | string | null
  estimate?: number | string | null
  period?: string | null
  quarter?: number | null
  symbol?: string | null
  year?: number | null
}

interface FinnhubQuoteResponse {
  c?: number | string | null
  d?: number | string | null
  dp?: number | string | null
  h?: number | string | null
  l?: number | string | null
  pc?: number | string | null
  t?: number | string | null
}

export interface FinnhubCompanyProfile {
  company: Company
  marketCap: number | null
  sharesOutstanding: number | null
  country: string | null
}

export class FinnhubRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinnhubRateLimitError'
  }
}

const finnhubBaseUrl = 'https://finnhub.io/api/v1'
const million = 1_000_000

const nowIso = () => new Date().toISOString()

const fetchFinnhub = async <T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<T> => {
  const url = new URL(path, finnhubBaseUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  url.searchParams.set('token', apiKey)

  const response = await fetch(url.toString())
  if (response.status === 429) {
    throw new FinnhubRateLimitError('Finnhub rate limit exceeded')
  }
  if (!response.ok) {
    throw new Error(`Finnhub request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

const normalizeNullableString = (value: string | null | undefined) => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

const finiteNumberOrNull = (value: FinnhubMetricValue) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized || normalized === 'None' || normalized === '-') {
    return null
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const firstFiniteNumber = (...values: FinnhubMetricValue[]) => {
  for (const value of values) {
    const parsed = finiteNumberOrNull(value)
    if (parsed !== null) {
      return parsed
    }
  }

  return null
}

const millionsToAbsolute = (value: FinnhubMetricValue) => {
  const parsed = finiteNumberOrNull(value)
  return parsed === null ? null : parsed * million
}

const percentToRatio = (value: FinnhubMetricValue) => {
  const parsed = finiteNumberOrNull(value)
  return parsed === null ? null : parsed / 100
}

const toIsoFromUnixTimestamp = (value: FinnhubMetricValue) => {
  const parsed = finiteNumberOrNull(value)
  return parsed === null || parsed <= 0 ? null : new Date(parsed * 1000).toISOString()
}

const createCompany = (input: {
  ticker: string
  name: string
  exchange: string | null
  industry: string | null
  country: string | null
  website: string | null
  ipoDate: string | null
}): Company => {
  const timestamp = nowIso()
  return {
    id: crypto.randomUUID(),
    ticker: input.ticker.toUpperCase(),
    name: input.name,
    exchange: input.exchange,
    sector: input.industry,
    industry: input.industry,
    description: null,
    lastSyncedAt: timestamp,
    createdAt: timestamp,
    website: input.website,
    ipoDate: input.ipoDate,
  }
}

export const getFinnhubCompanyProfile = async (
  ticker: string,
  apiKey: string,
): Promise<FinnhubCompanyProfile> => {
  const normalizedTicker = ticker.toUpperCase()
  const data = await fetchFinnhub<FinnhubCompanyProfileResponse>(
    '/stock/profile2',
    { symbol: normalizedTicker },
    apiKey,
  )

  const name = normalizeNullableString(data.name)
  if (!name) {
    throw new Error('Finnhub returned no company profile')
  }

  const industry = normalizeNullableString(data.finnhubIndustry)
  const country = normalizeNullableString(data.country)

  return {
    company: createCompany({
      ticker: normalizeNullableString(data.ticker) ?? normalizedTicker,
      name,
      exchange: normalizeNullableString(data.exchange),
      industry,
      country,
      website: normalizeNullableString(data.weburl),
      ipoDate: normalizeNullableString(data.ipo),
    }),
    marketCap: millionsToAbsolute(data.marketCapitalization),
    sharesOutstanding: millionsToAbsolute(data.shareOutstanding),
    country,
  }
}

export const getFinnhubBasicFinancials = async (
  companyId: string,
  ticker: string,
  apiKey: string,
  profile: FinnhubCompanyProfile | null = null,
): Promise<CompanyFundamentals> => {
  const normalizedTicker = ticker.toUpperCase()
  const data = await fetchFinnhub<FinnhubBasicFinancialsResponse>(
    '/stock/metric',
    { symbol: normalizedTicker, metric: 'all' },
    apiKey,
  )
  const metric = data.metric ?? {}
  const netMargin = finiteNumberOrNull(metric.netProfitMarginTTM)
  const timestamp = nowIso()

  return {
    id: crypto.randomUUID(),
    companyId,
    epsTtm: firstFiniteNumber(metric.epsTTM, metric.epsBasicExclExtraItemsTTM),
    revenue: null,
    netIncome: null,
    freeCashFlow: null,
    peRatio: firstFiniteNumber(metric.peTTM, metric.peBasicExclExtraTTM),
    marketCap: profile?.marketCap ?? null,
    dividendYield: percentToRatio(metric.dividendYieldIndicatedAnnual),
    debtToEquity: finiteNumberOrNull(metric['totalDebt/totalEquityQuarterly']),
    recordedDate: null,
    createdAt: timestamp,
    fiftyTwoWeekHigh: finiteNumberOrNull(metric['52WeekHigh']),
    fiftyTwoWeekLow: finiteNumberOrNull(metric['52WeekLow']),
    sharesOutstanding: profile?.sharesOutstanding ?? null,
    profitMargin: netMargin === null ? null : netMargin / 100,
    priceToSales: finiteNumberOrNull(metric.psTTM),
    priceToBook: firstFiniteNumber(metric.pbQuarterly, metric.pbAnnual),
    returnOnEquity: finiteNumberOrNull(metric.roeTTM),
    returnOnAssets: finiteNumberOrNull(metric.roaTTM),
    grossProfit: null,
    grossMargin: finiteNumberOrNull(metric.grossMarginTTM),
    operatingMargin: finiteNumberOrNull(metric.operatingMarginTTM),
    netMargin,
    currentRatio: finiteNumberOrNull(metric.currentRatioQuarterly),
    quickRatio: finiteNumberOrNull(metric.quickRatioQuarterly),
    analystTargetPrice: null,
    employees: null,
    country: profile?.country ?? null,
    address: null,
    fiscalYearEnd: null,
    latestQuarter: null,
    forwardPE: null,
    pegRatio: null,
    beta: finiteNumberOrNull(metric.beta),
    revenuePerShare: finiteNumberOrNull(metric.revenuePerShareTTM),
  }
}

export const getFinnhubCompanyEarnings = async (
  ticker: string,
  apiKey: string,
): Promise<CompanyEpsHistoryRow[]> => {
  const normalizedTicker = ticker.toUpperCase()
  const rows = await fetchFinnhub<FinnhubEarningsResponse[]>(
    '/stock/earnings',
    { symbol: normalizedTicker },
    apiKey,
  )

  return rows
    .map((row) => ({
      year:
        typeof row.year === 'number' && typeof row.quarter === 'number'
          ? `${row.year} Q${row.quarter}`
          : String(row.period ?? ''),
      eps: finiteNumberOrNull(row.actual),
    }))
    .filter((row) => row.year && row.eps !== null)
}

export const getFinnhubQuote = async (ticker: string, apiKey: string): Promise<StockQuote> => {
  const normalizedTicker = ticker.toUpperCase()
  const quote = await fetchFinnhub<FinnhubQuoteResponse>(
    '/quote',
    { symbol: normalizedTicker },
    apiKey,
  )
  const price = finiteNumberOrNull(quote.c)
  if (price === null) {
    throw new Error('Finnhub returned no quote price')
  }

  return {
    ticker: normalizedTicker,
    price,
    currency: null,
    marketTime: toIsoFromUnixTimestamp(quote.t),
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    change: finiteNumberOrNull(quote.d),
    changePercent: finiteNumberOrNull(quote.dp),
    dayHigh: finiteNumberOrNull(quote.h),
    dayLow: finiteNumberOrNull(quote.l),
    previousClose: finiteNumberOrNull(quote.pc),
  }
}
