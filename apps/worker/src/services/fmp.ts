import type {
  Company,
  CompanyEpsHistoryRow,
  CompanyFundamentals,
  CompanyIncomeHistoryRow,
} from '../types'
import type { StockHistory, StockQuote } from './yahoo'

interface FmpSearchResult {
  symbol?: string
  name?: string
  exchangeShortName?: string
  exchange?: string
}

interface FmpProfileResult {
  symbol?: string
  companyName?: string
  exchangeShortName?: string
  exchange?: string
  sector?: string
  industry?: string
  description?: string
  mktCap?: number
  marketCap?: number
  volAvg?: number
  price?: number
  beta?: number
  lastDiv?: number
  lastDividend?: number
  dividendYield?: number
  sharesOutstanding?: number
  fullTimeEmployees?: string
  country?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface FmpKeyMetricsResult {
  peRatioTTM?: number
  marketCapTTM?: number
  priceToSalesRatioTTM?: number
  priceToBookRatioTTM?: number
  priceEarningsToGrowthRatioTTM?: number
  pegRatioTTM?: number
  dividendYieldTTM?: number
  debtToEquityTTM?: number
  currentRatioTTM?: number
  quickRatioTTM?: number
  returnOnEquityTTM?: number
  returnOnAssetsTTM?: number
  netIncomePerShareTTM?: number
  freeCashFlowPerShareTTM?: number
}

interface FmpQuoteResult {
  symbol?: string
  price?: number
  exchange?: string
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  yearHigh?: number
  yearLow?: number
  timestamp?: number
  marketCap?: number
  change?: number
  changesPercentage?: number
  changePercentage?: number
}

interface FmpIncomeStatementResult {
  date?: string
  revenue?: number
  grossProfit?: number
  operatingIncome?: number
  operatingIncomeRatio?: number
  netIncomeRatio?: number
  netIncome?: number
  eps?: number
}

interface FmpCashFlowStatementResult {
  date?: string
  freeCashFlow?: number
}

interface FmpHistoricalPriceResult {
  date?: string
  close?: number
  adjClose?: number
}

interface FmpHistoricalPriceResponse {
  historical?: FmpHistoricalPriceResult[]
}

const fmpBaseUrl = 'https://financialmodelingprep.com/api'
const fmpStableBaseUrl = 'https://financialmodelingprep.com/stable'

const fetchFmp = async <T>(path: string, apiKey: string): Promise<T> => {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${fmpBaseUrl}${path}${separator}apikey=${apiKey}`)
  if (!response.ok) {
    throw new Error(`FMP request failed with ${response.status}`)
  }
  return (await response.json()) as T
}

const fetchFmpStable = async <T>(path: string, apiKey: string): Promise<T> => {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${fmpStableBaseUrl}${path}${separator}apikey=${apiKey}`)
  if (!response.ok) {
    throw new Error(`FMP stable request failed with ${response.status}`)
  }
  return (await response.json()) as T
}

const asArray = <T>(value: T[] | T | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

const isHistoricalPriceArray = (value: unknown): value is FmpHistoricalPriceResult[] =>
  Array.isArray(value)

const toMonthlyStockHistory = (rows: FmpHistoricalPriceResult[]): StockHistory => {
  const monthlyPrices = new Map<string, { date: string; price: number }>()

  rows
    .filter((row) => row.date && typeof row.close === 'number' && Number.isFinite(row.close))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .forEach((row) => {
      const date = row.date ?? ''
      const close = row.adjClose ?? row.close
      if (typeof close !== 'number' || !Number.isFinite(close)) {
        return
      }
      monthlyPrices.set(date.slice(0, 7), { date, price: close })
    })

  const monthlyRows = Array.from(monthlyPrices.values())
  if (monthlyRows.length === 0) {
    throw new Error('FMP returned no historical prices')
  }

  return {
    dates: monthlyRows.map((row) => row.date),
    prices: monthlyRows.map((row) => row.price),
  }
}

const finiteNumberOrNull = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const finiteIntegerFromStringOrNull = (value: string | null | undefined) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : null
}

const compactAddress = (profile: FmpProfileResult | undefined) => {
  const parts = [profile?.address, profile?.city, profile?.state, profile?.zip]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(', ') : null
}

const ratioToPercent = (value: number | null | undefined) => {
  const finiteValue = finiteNumberOrNull(value)
  return typeof finiteValue === 'number' ? finiteValue * 100 : null
}

const percentFromValues = (
  numerator: number | null | undefined,
  denominator: number | null | undefined,
) => {
  if (
    typeof numerator !== 'number' ||
    !Number.isFinite(numerator) ||
    typeof denominator !== 'number' ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null
  }

  return (numerator / denominator) * 100
}

const toIsoFromUnixTimestamp = (timestamp: number | undefined) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return null
  }

  return new Date(timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000).toISOString()
}

const createCompany = (input: {
  ticker: string
  name: string
  exchange?: string | null
  sector?: string | null
  industry?: string | null
  description?: string | null
}): Company => {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    ticker: input.ticker.toUpperCase(),
    name: input.name,
    exchange: input.exchange ?? null,
    sector: input.sector ?? null,
    industry: input.industry ?? null,
    description: input.description ?? null,
    lastSyncedAt: now,
    createdAt: now,
  }
}

export const searchFmpCompanies = async (query: string, apiKey: string): Promise<Company[]> => {
  const results = await fetchFmpStable<FmpSearchResult[]>(
    `/search-symbol?query=${encodeURIComponent(query)}&limit=10`,
    apiKey,
  )
  return results
    .filter((result) => result.symbol && result.name)
    .map((result) =>
      createCompany({
        ticker: result.symbol ?? '',
        name: result.name ?? '',
        exchange: result.exchangeShortName ?? result.exchange ?? null,
      }),
    )
}

export const getFmpCompanyProfile = async (ticker: string, apiKey: string): Promise<Company | null> => {
  const results = await fetchFmpStable<FmpProfileResult[]>(
    `/profile?symbol=${encodeURIComponent(ticker.toUpperCase())}`,
    apiKey,
  )
  const profile = results.at(0)
  if (!profile?.symbol || !profile.companyName) {
    return null
  }

  return createCompany({
    ticker: profile.symbol,
    name: profile.companyName,
    exchange: profile.exchangeShortName ?? profile.exchange ?? null,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    description: profile.description ?? null,
  })
}

export const getFmpQuote = async (ticker: string, apiKey: string): Promise<StockQuote> => {
  const normalizedTicker = ticker.toUpperCase()
  const results = await fetchFmpStable<FmpQuoteResult[]>(
    `/quote?symbol=${encodeURIComponent(normalizedTicker)}`,
    apiKey,
  )
  const quote = results.at(0)
  if (typeof quote?.price !== 'number' || !Number.isFinite(quote.price)) {
    throw new Error('FMP returned no quote price')
  }

  return {
    ticker: quote.symbol?.toUpperCase() ?? normalizedTicker,
    price: quote.price,
    currency: null,
    marketTime: toIsoFromUnixTimestamp(quote.timestamp),
    fiftyTwoWeekHigh: finiteNumberOrNull(quote.fiftyTwoWeekHigh ?? quote.yearHigh),
    fiftyTwoWeekLow: finiteNumberOrNull(quote.fiftyTwoWeekLow ?? quote.yearLow),
    change: finiteNumberOrNull(quote.change),
    changePercent: finiteNumberOrNull(quote.changesPercentage ?? quote.changePercentage),
  }
}

const toIncomeHistoryRows = (rows: FmpIncomeStatementResult[]): CompanyIncomeHistoryRow[] =>
  rows
    .filter((row) => row.date && (typeof row.revenue === 'number' || typeof row.netIncome === 'number'))
    .slice(0, 5)
    .map((row) => ({
      year: String(row.date).slice(0, 4),
      revenue: finiteNumberOrNull(row.revenue),
      netIncome: finiteNumberOrNull(row.netIncome),
    }))
    .sort((left, right) => left.year.localeCompare(right.year))

export const getFmpIncomeHistory = async (
  ticker: string,
  apiKey: string,
): Promise<CompanyIncomeHistoryRow[]> => {
  const results = await fetchFmpStable<FmpIncomeStatementResult[]>(
    `/income-statement?symbol=${encodeURIComponent(ticker.toUpperCase())}&period=annual&limit=5`,
    apiKey,
  )
  const rows = toIncomeHistoryRows(results)
  if (rows.length === 0) {
    throw new Error('FMP returned no income history')
  }

  return rows
}

export const getFmpEpsHistory = async (
  ticker: string,
  apiKey: string,
): Promise<CompanyEpsHistoryRow[]> => {
  const results = await fetchFmpStable<FmpIncomeStatementResult[]>(
    `/income-statement?symbol=${encodeURIComponent(ticker.toUpperCase())}&period=annual&limit=5`,
    apiKey,
  )
  const rows = results
    .filter((row) => row.date && typeof row.eps === 'number' && Number.isFinite(row.eps))
    .slice(0, 5)
    .map((row) => ({
      year: String(row.date).slice(0, 4),
      eps: finiteNumberOrNull(row.eps),
    }))
    .sort((left, right) => left.year.localeCompare(right.year))

  if (rows.length === 0) {
    throw new Error('FMP returned no EPS history')
  }

  return rows
}

export const getFmpFundamentals = async (
  companyId: string,
  ticker: string,
  apiKey: string,
): Promise<CompanyFundamentals> => {
  const normalizedTicker = ticker.toUpperCase()
  const [metricsResponse, incomeResults, cashFlowResults, profileResults, quoteResults] = await Promise.all([
    fetchFmpStable<FmpKeyMetricsResult[] | FmpKeyMetricsResult>(
      `/key-metrics-ttm?symbol=${encodeURIComponent(normalizedTicker)}`,
      apiKey,
    ),
    fetchFmpStable<FmpIncomeStatementResult[]>(
      `/income-statement?symbol=${encodeURIComponent(normalizedTicker)}&period=annual&limit=5`,
      apiKey,
    ),
    fetchFmpStable<FmpCashFlowStatementResult[]>(
      `/cash-flow-statement?symbol=${encodeURIComponent(normalizedTicker)}&period=annual&limit=5`,
      apiKey,
    ),
    fetchFmpStable<FmpProfileResult[]>(
      `/profile?symbol=${encodeURIComponent(normalizedTicker)}`,
      apiKey,
    ),
    fetchFmpStable<FmpQuoteResult[]>(
      `/quote?symbol=${encodeURIComponent(normalizedTicker)}`,
      apiKey,
    ),
  ])

  const metrics = asArray(metricsResponse).at(0)
  const income = incomeResults.at(0)
  const cashFlow = cashFlowResults.at(0)
  const profile = profileResults.at(0)
  const quote = quoteResults.at(0)
  const epsTtm = finiteNumberOrNull(metrics?.netIncomePerShareTTM ?? income?.eps)
  const peRatio =
    finiteNumberOrNull(metrics?.peRatioTTM) ??
    (typeof quote?.price === 'number' && typeof epsTtm === 'number' && epsTtm !== 0
      ? quote.price / epsTtm
      : null)
  const lastDividend = finiteNumberOrNull(profile?.lastDividend ?? profile?.lastDiv)
  const dividendYield =
    finiteNumberOrNull(profile?.dividendYield ?? metrics?.dividendYieldTTM) ??
    (typeof lastDividend === 'number' &&
    typeof quote?.price === 'number' &&
    Number.isFinite(quote.price) &&
    quote.price > 0
      ? lastDividend / quote.price
      : null)
  const grossProfit = finiteNumberOrNull(income?.grossProfit)
  const operatingMargin =
    ratioToPercent(income?.operatingIncomeRatio) ??
    percentFromValues(income?.operatingIncome, income?.revenue)
  const netMargin =
    ratioToPercent(income?.netIncomeRatio) ?? percentFromValues(income?.netIncome, income?.revenue)

  return {
    id: crypto.randomUUID(),
    companyId,
    epsTtm,
    revenue: finiteNumberOrNull(income?.revenue),
    netIncome: finiteNumberOrNull(income?.netIncome),
    freeCashFlow: finiteNumberOrNull(cashFlow?.freeCashFlow),
    peRatio,
    marketCap: finiteNumberOrNull(
      metrics?.marketCapTTM ?? profile?.mktCap ?? profile?.marketCap ?? quote?.marketCap,
    ),
    dividendYield,
    debtToEquity: finiteNumberOrNull(metrics?.debtToEquityTTM),
    recordedDate: income?.date ?? null,
    createdAt: new Date().toISOString(),
    fiftyTwoWeekHigh: finiteNumberOrNull(quote?.fiftyTwoWeekHigh ?? quote?.yearHigh),
    fiftyTwoWeekLow: finiteNumberOrNull(quote?.fiftyTwoWeekLow ?? quote?.yearLow),
    sharesOutstanding: finiteNumberOrNull(profile?.sharesOutstanding),
    profitMargin: null,
    priceToSales: finiteNumberOrNull(metrics?.priceToSalesRatioTTM),
    priceToBook: finiteNumberOrNull(metrics?.priceToBookRatioTTM),
    returnOnEquity: ratioToPercent(metrics?.returnOnEquityTTM),
    returnOnAssets: ratioToPercent(metrics?.returnOnAssetsTTM),
    grossProfit,
    operatingMargin,
    netMargin,
    currentRatio: finiteNumberOrNull(metrics?.currentRatioTTM),
    quickRatio: finiteNumberOrNull(metrics?.quickRatioTTM),
    analystTargetPrice: null,
    employees: finiteIntegerFromStringOrNull(profile?.fullTimeEmployees),
    country: profile?.country ?? null,
    address: compactAddress(profile),
    fiscalYearEnd: null,
    latestQuarter: null,
    forwardPE: null,
    pegRatio: finiteNumberOrNull(
      metrics?.priceEarningsToGrowthRatioTTM ?? metrics?.pegRatioTTM,
    ),
    beta: finiteNumberOrNull(profile?.beta),
  }
}

export const getFmpHistoricalPrices = async (
  ticker: string,
  apiKey: string,
  fromDate: string,
): Promise<StockHistory> => {
  try {
    const stableData = await fetchFmpStable<unknown>(
      `/historical-price-eod/full?symbol=${encodeURIComponent(
        ticker.toUpperCase(),
      )}&from=${encodeURIComponent(fromDate)}`,
      apiKey,
    )
    if (isHistoricalPriceArray(stableData)) {
      return toMonthlyStockHistory(stableData)
    }
  } catch {
    // Fall back to the legacy v3 endpoint below.
  }

  const legacyData = await fetchFmp<FmpHistoricalPriceResponse>(
    `/v3/historical-price-full/${encodeURIComponent(
      ticker.toUpperCase(),
    )}?from=${encodeURIComponent(fromDate)}&serietype=line`,
    apiKey,
  )
  return toMonthlyStockHistory(legacyData.historical ?? [])
}
