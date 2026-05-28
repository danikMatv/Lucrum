import type { Company, CompanyFundamentals } from '../types'

interface FmpSearchResult {
  symbol?: string
  name?: string
  exchangeShortName?: string
}

interface FmpProfileResult {
  symbol?: string
  companyName?: string
  exchangeShortName?: string
  sector?: string
  industry?: string
  description?: string
  mktCap?: number
  volAvg?: number
  price?: number
  beta?: number
  lastDiv?: number
}

interface FmpKeyMetricsResult {
  peRatioTTM?: number
  marketCapTTM?: number
  dividendYieldTTM?: number
  debtToEquityTTM?: number
  netIncomePerShareTTM?: number
  freeCashFlowPerShareTTM?: number
}

interface FmpIncomeStatementResult {
  date?: string
  revenue?: number
  netIncome?: number
  eps?: number
}

const fmpBaseUrl = 'https://financialmodelingprep.com/api'

const fetchFmp = async <T>(path: string, apiKey: string): Promise<T> => {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${fmpBaseUrl}${path}${separator}apikey=${apiKey}`)
  if (!response.ok) {
    throw new Error(`FMP request failed with ${response.status}`)
  }
  return (await response.json()) as T
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
  const results = await fetchFmp<FmpSearchResult[]>(
    `/v3/search?query=${encodeURIComponent(query)}&limit=10`,
    apiKey,
  )
  return results
    .filter((result) => result.symbol && result.name)
    .map((result) =>
      createCompany({
        ticker: result.symbol ?? '',
        name: result.name ?? '',
        exchange: result.exchangeShortName ?? null,
      }),
    )
}

export const getFmpCompanyProfile = async (ticker: string, apiKey: string): Promise<Company | null> => {
  const results = await fetchFmp<FmpProfileResult[]>(`/v3/profile/${ticker.toUpperCase()}`, apiKey)
  const profile = results.at(0)
  if (!profile?.symbol || !profile.companyName) {
    return null
  }

  return createCompany({
    ticker: profile.symbol,
    name: profile.companyName,
    exchange: profile.exchangeShortName ?? null,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    description: profile.description ?? null,
  })
}

export const getFmpFundamentals = async (
  companyId: string,
  ticker: string,
  apiKey: string,
): Promise<CompanyFundamentals> => {
  const [metricsResults, incomeResults] = await Promise.all([
    fetchFmp<FmpKeyMetricsResult[]>(`/v3/key-metrics-ttm/${ticker.toUpperCase()}`, apiKey),
    fetchFmp<FmpIncomeStatementResult[]>(
      `/v3/income-statement/${ticker.toUpperCase()}?limit=1`,
      apiKey,
    ),
  ])

  const metrics = metricsResults.at(0)
  const income = incomeResults.at(0)

  return {
    id: crypto.randomUUID(),
    companyId,
    epsTtm: metrics?.netIncomePerShareTTM ?? income?.eps ?? null,
    revenue: income?.revenue ?? null,
    netIncome: income?.netIncome ?? null,
    freeCashFlow: metrics?.freeCashFlowPerShareTTM ?? null,
    peRatio: metrics?.peRatioTTM ?? null,
    marketCap: metrics?.marketCapTTM ?? null,
    dividendYield: metrics?.dividendYieldTTM ?? null,
    debtToEquity: metrics?.debtToEquityTTM ?? null,
    recordedDate: income?.date ?? null,
    createdAt: new Date().toISOString(),
  }
}
