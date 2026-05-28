export interface StockMetricSnapshot {
  peRatio: number
  eps: number
  marketCap: number
  revenue: number
  netIncome: number
  freeCashFlow: number
  debtToEquity: number
  dividendYield: number
}

export interface StockYearFinancial {
  year: number
  revenue: number
  netIncome: number
}

export interface StockAnalysisResult {
  name: string
  ticker: string
  exchange: string
  sector: string
  currentPrice: number
  changePercent: number
  weekHigh52: number
  weekLow52: number
  metrics: StockMetricSnapshot
  financials: StockYearFinancial[]
  verdict: 'strong' | 'balanced' | 'expensive'
}

const profiles: Record<string, Omit<StockAnalysisResult, 'ticker'>> = {
  AAPL: {
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    currentPrice: 190.12,
    changePercent: 1.8,
    weekHigh52: 237.49,
    weekLow52: 164.08,
    metrics: {
      peRatio: 29.2,
      eps: 6.5,
      marketCap: 2920000000000,
      revenue: 383000000000,
      netIncome: 97000000000,
      freeCashFlow: 99500000000,
      debtToEquity: 1.45,
      dividendYield: 0.52,
    },
    financials: [
      { year: 2021, revenue: 365000000000, netIncome: 95000000000 },
      { year: 2022, revenue: 394000000000, netIncome: 99800000000 },
      { year: 2023, revenue: 383000000000, netIncome: 97000000000 },
      { year: 2024, revenue: 391000000000, netIncome: 101000000000 },
      { year: 2025, revenue: 405000000000, netIncome: 106000000000 },
    ],
    verdict: 'balanced',
  },
}

export const getMockStockAnalysis = (tickerInput: string): StockAnalysisResult => {
  const ticker = tickerInput.trim().toUpperCase() || 'AAPL'
  const profile = profiles[ticker] ?? profiles.AAPL
  const peRatio = profile.metrics.peRatio
  const verdict =
    peRatio < 22 && profile.metrics.debtToEquity < 1
      ? 'strong'
      : peRatio > 35 || profile.metrics.debtToEquity > 2
        ? 'expensive'
        : 'balanced'

  return {
    ...profile,
    ticker,
    verdict,
  }
}
