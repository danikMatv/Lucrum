import type {
  Company,
  CompanyEpsHistoryRow,
  CompanyFundamentals,
  CompanyIncomeHistoryRow,
} from '../types'

interface AlphaVantageOverviewResponse {
  Symbol?: string
  Name?: string
  Exchange?: string
  Sector?: string
  Industry?: string
  Description?: string
  PERatio?: string
  MarketCapitalization?: string
  DilutedEPSTTM?: string
  EPS?: string
  DividendYield?: string
  '52WeekHigh'?: string
  '52WeekLow'?: string
  SharesOutstanding?: string
  RevenueTTM?: string
  ProfitMargin?: string
  PriceToSalesRatioTTM?: string
  PriceToBookRatio?: string
  ReturnOnEquityTTM?: string
  ReturnOnAssetsTTM?: string
  GrossProfitTTM?: string
  OperatingMarginTTM?: string
  CurrentRatio?: string
  QuickRatio?: string
  AnalystTargetPrice?: string
  FullTimeEmployees?: string
  Country?: string
  Address?: string
  FiscalYearEnd?: string
  LatestQuarter?: string
  ForwardPE?: string
  PEGRatio?: string
  Beta?: string
  Note?: string
  Information?: string
}

interface AlphaVantageIncomeStatementResponse {
  symbol?: string
  annualReports?: Array<{
    fiscalDateEnding?: string
    totalRevenue?: string
    netIncome?: string
  }>
  Note?: string
  Information?: string
}

interface AlphaVantageEarningsResponse {
  symbol?: string
  annualEarnings?: Array<{
    fiscalDateEnding?: string
    reportedEPS?: string
  }>
  Note?: string
  Information?: string
}

export interface AlphaVantageOverview {
  company: Company
  fundamentals: CompanyFundamentals
}

export class AlphaVantageRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlphaVantageRateLimitError'
  }
}

const alphaVantageBaseUrl = 'https://www.alphavantage.co/query'

const nowIso = () => new Date().toISOString()

const isRateLimited = (value: { Note?: string; Information?: string }) =>
  Boolean(value.Note || value.Information)

const assertNotRateLimited = (value: { Note?: string; Information?: string }) => {
  if (isRateLimited(value)) {
    throw new AlphaVantageRateLimitError(value.Note ?? value.Information ?? 'Alpha Vantage limited')
  }
}

const fetchAlphaVantage = async <T>(
  params: Record<string, string>,
  apiKey: string,
): Promise<T> => {
  const url = new URL(alphaVantageBaseUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  url.searchParams.set('apikey', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

const normalizeNullableString = (value: string | undefined) => {
  const normalized = value?.trim()
  if (!normalized || normalized === 'None' || normalized === '-') {
    return null
  }

  return normalized
}

const parseNumber = (value: string | undefined) => {
  const normalized = normalizeNullableString(value)
  if (!normalized) {
    return null
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseInteger = (value: string | undefined) => {
  const normalized = normalizeNullableString(value)
  if (!normalized) {
    return null
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const percentNumber = (value: string | undefined) => {
  const parsed = parseNumber(value)
  return typeof parsed === 'number' ? parsed * 100 : null
}

const resolveEpsTtm = (data: AlphaVantageOverviewResponse) =>
  parseNumber(data.DilutedEPSTTM) ?? parseNumber(data.EPS)

const createCompany = (input: {
  ticker: string
  name: string
  exchange: string | null
  sector: string | null
  industry: string | null
  description: string | null
}): Company => {
  const timestamp = nowIso()
  return {
    id: crypto.randomUUID(),
    ticker: input.ticker.toUpperCase(),
    name: input.name,
    exchange: input.exchange,
    sector: input.sector,
    industry: input.industry,
    description: input.description,
    lastSyncedAt: timestamp,
    createdAt: timestamp,
  }
}

export const getAlphaVantageOverview = async (
  ticker: string,
  apiKey: string,
): Promise<AlphaVantageOverview> => {
  const normalizedTicker = ticker.toUpperCase()
  const data = await fetchAlphaVantage<AlphaVantageOverviewResponse>(
    { function: 'OVERVIEW', symbol: normalizedTicker },
    apiKey,
  )
  assertNotRateLimited(data)

  const name = normalizeNullableString(data.Name)
  if (!name) {
    throw new Error('Alpha Vantage returned no company overview')
  }

  const company = createCompany({
    ticker: data.Symbol ?? normalizedTicker,
    name,
    exchange: normalizeNullableString(data.Exchange),
    sector: normalizeNullableString(data.Sector),
    industry: normalizeNullableString(data.Industry),
    description: normalizeNullableString(data.Description),
  })

  return {
    company,
    fundamentals: {
      id: crypto.randomUUID(),
      companyId: company.id,
      epsTtm: resolveEpsTtm(data),
      revenue: parseInteger(data.RevenueTTM),
      netIncome: null,
      freeCashFlow: null,
      peRatio: parseNumber(data.PERatio),
      marketCap: parseInteger(data.MarketCapitalization),
      dividendYield: parseNumber(data.DividendYield),
      debtToEquity: null,
      recordedDate: null,
      createdAt: nowIso(),
      fiftyTwoWeekHigh: parseNumber(data['52WeekHigh']),
      fiftyTwoWeekLow: parseNumber(data['52WeekLow']),
      sharesOutstanding: parseInteger(data.SharesOutstanding),
      profitMargin: parseNumber(data.ProfitMargin),
      priceToSales: parseNumber(data.PriceToSalesRatioTTM),
      priceToBook: parseNumber(data.PriceToBookRatio),
      returnOnEquity: percentNumber(data.ReturnOnEquityTTM),
      returnOnAssets: percentNumber(data.ReturnOnAssetsTTM),
      grossProfit: parseInteger(data.GrossProfitTTM),
      operatingMargin: percentNumber(data.OperatingMarginTTM),
      netMargin: percentNumber(data.ProfitMargin),
      currentRatio: parseNumber(data.CurrentRatio),
      quickRatio: parseNumber(data.QuickRatio),
      analystTargetPrice: parseNumber(data.AnalystTargetPrice),
      employees: parseInteger(data.FullTimeEmployees),
      country: normalizeNullableString(data.Country),
      address: normalizeNullableString(data.Address),
      fiscalYearEnd: normalizeNullableString(data.FiscalYearEnd),
      latestQuarter: normalizeNullableString(data.LatestQuarter),
      forwardPE: parseNumber(data.ForwardPE),
      pegRatio: parseNumber(data.PEGRatio),
      beta: parseNumber(data.Beta),
    },
  }
}

export const getAlphaVantageIncomeHistory = async (
  ticker: string,
  apiKey: string,
): Promise<CompanyIncomeHistoryRow[]> => {
  const normalizedTicker = ticker.toUpperCase()
  const data = await fetchAlphaVantage<AlphaVantageIncomeStatementResponse>(
    { function: 'INCOME_STATEMENT', symbol: normalizedTicker },
    apiKey,
  )
  assertNotRateLimited(data)

  const rows = (data.annualReports ?? [])
    .slice(0, 5)
    .map((report) => ({
      year: String(report.fiscalDateEnding ?? '').slice(0, 4),
      revenue: parseInteger(report.totalRevenue),
      netIncome: parseInteger(report.netIncome),
    }))
    .filter((row) => row.year && (row.revenue !== null || row.netIncome !== null))
    .sort((left, right) => left.year.localeCompare(right.year))

  if (rows.length === 0) {
    throw new Error('Alpha Vantage returned no income history')
  }

  return rows
}

export const getAlphaVantageEarnings = async (
  ticker: string,
  apiKey: string,
): Promise<CompanyEpsHistoryRow[]> => {
  const normalizedTicker = ticker.toUpperCase()
  const data = await fetchAlphaVantage<AlphaVantageEarningsResponse>(
    { function: 'EARNINGS', symbol: normalizedTicker },
    apiKey,
  )
  assertNotRateLimited(data)

  const rows = (data.annualEarnings ?? [])
    .slice(0, 5)
    .map((report) => ({
      year: String(report.fiscalDateEnding ?? '').slice(0, 4),
      eps: parseNumber(report.reportedEPS),
    }))
    .filter((row) => row.year && row.eps !== null)
    .sort((left, right) => left.year.localeCompare(right.year))

  if (rows.length === 0) {
    throw new Error('Alpha Vantage returned no EPS history')
  }

  return rows
}
