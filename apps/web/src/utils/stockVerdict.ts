import type {
  CompanyFundamentals,
  CompanyIncomeHistoryRow,
  StockQuote,
} from '../types/api.ts'

export interface StockInsight {
  key: string
  values?: Record<string, string | number>
}

export interface StockInsights {
  strengths: StockInsight[]
  weaknesses: StockInsight[]
  neutral: StockInsight[]
}

export interface RevenueGrowthRow {
  year: string
  revenue: number
  yoyGrowth: number | null
}

export interface RevenueGrowthAnalysis {
  rows: RevenueGrowthRow[]
  cagr: number | null
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const hasRevenueGrowthStreak = (rows: CompanyIncomeHistoryRow[], years: number) => {
  const revenueRows = rows
    .filter((row): row is CompanyIncomeHistoryRow & { revenue: number } =>
      isFiniteNumber(row.revenue),
    )
    .sort((left, right) => left.year.localeCompare(right.year))

  if (revenueRows.length < years + 1) {
    return false
  }

  return revenueRows.slice(-1 * (years + 1)).every((row, index, slicedRows) => {
    if (index === 0) {
      return true
    }

    return row.revenue > slicedRows[index - 1].revenue
  })
}

const hasRevenueDecline = (rows: CompanyIncomeHistoryRow[]) => {
  const revenueRows = rows
    .filter((row): row is CompanyIncomeHistoryRow & { revenue: number } =>
      isFiniteNumber(row.revenue),
    )
    .sort((left, right) => left.year.localeCompare(right.year))

  if (revenueRows.length < 3) {
    return false
  }

  return revenueRows.slice(-3).every((row, index, slicedRows) => {
    if (index === 0) {
      return true
    }

    return row.revenue < slicedRows[index - 1].revenue
  })
}

export const generateStockInsights = (
  fundamentals: CompanyFundamentals | null,
  incomeHistory: CompanyIncomeHistoryRow[],
  quote: StockQuote | null,
): StockInsights => {
  const strengths: StockInsight[] = []
  const weaknesses: StockInsight[] = []
  const neutral: StockInsight[] = []

  if (!fundamentals) {
    return { strengths, weaknesses, neutral }
  }

  if (isFiniteNumber(fundamentals.peRatio) && fundamentals.peRatio < 15) {
    strengths.push({ key: 'tools.stock.insightItems.lowPe' })
  }

  if (isFiniteNumber(fundamentals.returnOnEquity)) {
    if (fundamentals.returnOnEquity > 15) {
      strengths.push({
        key: 'tools.stock.insightItems.strongRoe',
        values: { value: fundamentals.returnOnEquity.toFixed(1) },
      })
    } else if (fundamentals.returnOnEquity < 0) {
      weaknesses.push({ key: 'tools.stock.insightItems.negativeRoe' })
    }
  }

  if (isFiniteNumber(fundamentals.netMargin)) {
    if (fundamentals.netMargin > 20) {
      strengths.push({
        key: 'tools.stock.insightItems.highNetMargin',
        values: { value: fundamentals.netMargin.toFixed(1) },
      })
    } else if (fundamentals.netMargin < 0) {
      weaknesses.push({ key: 'tools.stock.insightItems.unprofitable' })
    }
  }

  if (isFiniteNumber(fundamentals.currentRatio)) {
    if (fundamentals.currentRatio > 2) {
      strengths.push({ key: 'tools.stock.insightItems.strongLiquidity' })
    } else if (fundamentals.currentRatio < 1) {
      weaknesses.push({ key: 'tools.stock.insightItems.liquidityRisk' })
    }
  }

  if (hasRevenueGrowthStreak(incomeHistory, 3)) {
    strengths.push({ key: 'tools.stock.insightItems.revenueGrowth' })
  }

  if (
    isFiniteNumber(fundamentals.analystTargetPrice) &&
    isFiniteNumber(quote?.price) &&
    fundamentals.analystTargetPrice > quote.price * 1.1
  ) {
    strengths.push({
      key: 'tools.stock.insightItems.analystUpside',
      values: { value: fundamentals.analystTargetPrice.toFixed(2) },
    })
  }

  if (isFiniteNumber(fundamentals.freeCashFlow)) {
    if (fundamentals.freeCashFlow > 0) {
      strengths.push({ key: 'tools.stock.insightItems.positiveFcf' })
    } else if (fundamentals.freeCashFlow < 0) {
      weaknesses.push({ key: 'tools.stock.insightItems.negativeFcf' })
    }
  }

  if (isFiniteNumber(fundamentals.dividendYield) && fundamentals.dividendYield > 0) {
    strengths.push({
      key: 'tools.stock.insightItems.dividendPayer',
      values: { value: (fundamentals.dividendYield * 100).toFixed(2) },
    })
  } else {
    neutral.push({ key: 'tools.stock.insightItems.noDividend' })
  }

  if (isFiniteNumber(fundamentals.peRatio) && fundamentals.peRatio > 50) {
    weaknesses.push({ key: 'tools.stock.insightItems.highPe' })
  }

  if (hasRevenueDecline(incomeHistory)) {
    weaknesses.push({ key: 'tools.stock.insightItems.revenueDecline' })
  }

  if (isFiniteNumber(fundamentals.beta)) {
    if (fundamentals.beta > 1.5) {
      weaknesses.push({
        key: 'tools.stock.insightItems.highBeta',
        values: { value: fundamentals.beta.toFixed(2) },
      })
    } else if (fundamentals.beta >= 0.8 && fundamentals.beta <= 1.2) {
      neutral.push({ key: 'tools.stock.insightItems.marketBeta' })
    }
  }

  return { strengths, weaknesses, neutral }
}

export const calculateRevenueGrowth = (
  incomeHistory: CompanyIncomeHistoryRow[],
): RevenueGrowthAnalysis => {
  const rows = incomeHistory
    .filter((row): row is CompanyIncomeHistoryRow & { revenue: number } =>
      isFiniteNumber(row.revenue),
    )
    .sort((left, right) => left.year.localeCompare(right.year))
    .map<RevenueGrowthRow>((row, index, sortedRows) => {
      const previous = sortedRows[index - 1]
      const yoyGrowth =
        previous && previous.revenue !== 0
          ? ((row.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100
          : null

      return {
        year: row.year,
        revenue: row.revenue,
        yoyGrowth,
      }
    })

  const first = rows.at(0)
  const last = rows.at(-1)
  const periods = rows.length - 1
  const cagr =
    first && last && periods > 0 && first.revenue > 0
      ? (Math.pow(last.revenue / first.revenue, 1 / periods) - 1) * 100
      : null

  return { rows, cagr }
}
