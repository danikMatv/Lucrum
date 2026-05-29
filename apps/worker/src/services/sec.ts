import type { Company, CompanyFundamentals } from '../types'

interface SecTickerRow {
  cik_str?: number
  ticker?: string
  title?: string
}

interface SecCompanyFactsResponse {
  entityName?: string
  facts?: {
    'us-gaap'?: Record<string, SecFact>
    dei?: Record<string, SecFact>
  }
}

interface SecFact {
  units?: Record<string, SecFactUnit[]>
}

interface SecFactUnit {
  val?: number
  end?: string
  filed?: string
  form?: string
  fp?: string
  fy?: number
}

export interface SecCompanyProfile {
  cik: string
  company: Company
}

const secHeaders = {
  'User-Agent': 'Lucrum contact@lucrum.app',
  Accept: 'application/json',
}

const nowIso = () => new Date().toISOString()

const toCik = (value: number) => value.toString().padStart(10, '0')

const fetchSecJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: secHeaders })
  if (!response.ok) {
    throw new Error(`SEC request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

const getFactRows = (
  facts: SecCompanyFactsResponse,
  tag: string,
  unit: string,
) => facts.facts?.['us-gaap']?.[tag]?.units?.[unit] ?? facts.facts?.dei?.[tag]?.units?.[unit] ?? []

const latestValue = (
  facts: SecCompanyFactsResponse,
  tags: string[],
  units: string[],
) => {
  const rows = tags.flatMap((tag) => units.flatMap((unit) => getFactRows(facts, tag, unit)))
  const sortedRows = rows
    .filter((row) => typeof row.val === 'number' && Number.isFinite(row.val))
    .sort((left, right) => {
      const leftDate = left.filed ?? left.end ?? ''
      const rightDate = right.filed ?? right.end ?? ''
      return rightDate.localeCompare(leftDate)
    })

  return sortedRows.at(0)?.val ?? null
}

const latestDate = (facts: SecCompanyFactsResponse, tags: string[], units: string[]) => {
  const rows = tags.flatMap((tag) => units.flatMap((unit) => getFactRows(facts, tag, unit)))
  const sortedRows = rows
    .filter((row) => row.filed || row.end)
    .sort((left, right) => {
      const leftDate = left.filed ?? left.end ?? ''
      const rightDate = right.filed ?? right.end ?? ''
      return rightDate.localeCompare(leftDate)
    })

  return sortedRows.at(0)?.end ?? sortedRows.at(0)?.filed ?? null
}

export const getSecCompanyProfile = async (ticker: string): Promise<SecCompanyProfile | null> => {
  const normalizedTicker = ticker.toUpperCase()
  const tickers = await fetchSecJson<Record<string, SecTickerRow>>(
    'https://www.sec.gov/files/company_tickers.json',
  )
  const row = Object.values(tickers).find(
    (candidate) => candidate.ticker?.toUpperCase() === normalizedTicker,
  )

  if (!row?.cik_str || !row.ticker || !row.title) {
    return null
  }

  const now = nowIso()
  return {
    cik: toCik(row.cik_str),
    company: {
      id: crypto.randomUUID(),
      ticker: row.ticker.toUpperCase(),
      name: row.title,
      exchange: null,
      sector: null,
      industry: null,
      description: null,
      lastSyncedAt: now,
      createdAt: now,
    },
  }
}

export const getSecFundamentals = async (
  companyId: string,
  cik: string,
): Promise<CompanyFundamentals> => {
  const facts = await fetchSecJson<SecCompanyFactsResponse>(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
  )
  const revenue = latestValue(
    facts,
    ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
    ['USD'],
  )
  const netIncome = latestValue(facts, ['NetIncomeLoss'], ['USD'])
  const operatingCashFlow = latestValue(
    facts,
    ['NetCashProvidedByUsedInOperatingActivities'],
    ['USD'],
  )
  const capex = latestValue(facts, ['PaymentsToAcquirePropertyPlantAndEquipment'], ['USD'])
  const shares = latestValue(facts, ['EntityCommonStockSharesOutstanding'], ['shares'])
  const epsTtm = latestValue(
    facts,
    ['EarningsPerShareDiluted', 'EarningsPerShareBasic'],
    ['USD/shares'],
  )
  const liabilities = latestValue(facts, ['Liabilities'], ['USD'])
  const equity = latestValue(
    facts,
    ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
    ['USD'],
  )
  const freeCashFlow =
    typeof operatingCashFlow === 'number' && typeof capex === 'number'
      ? operatingCashFlow - capex
      : null
  const marketCap =
    typeof shares === 'number' && typeof epsTtm === 'number' && typeof netIncome === 'number'
      ? null
      : null
  const debtToEquity =
    typeof liabilities === 'number' && typeof equity === 'number' && equity !== 0
      ? liabilities / equity
      : null

  return {
    id: crypto.randomUUID(),
    companyId,
    epsTtm,
    revenue,
    netIncome,
    freeCashFlow,
    peRatio: null,
    marketCap,
    dividendYield: null,
    debtToEquity,
    recordedDate: latestDate(
      facts,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'NetIncomeLoss'],
      ['USD'],
    ),
    createdAt: nowIso(),
  }
}
