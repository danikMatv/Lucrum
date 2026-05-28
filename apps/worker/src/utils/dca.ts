import type { StockHistory } from '../services/yahoo'

export interface DcaResult {
  ticker: string
  amount: number
  invested: number
  shares: number
  portfolioValue: number
  profit: number
  returnPercent: number
  averagePrice: number
  source: 'live' | 'mock'
  rows: Array<{
    date: string
    price: number
    invested: number
    shares: number
    portfolioValue: number
  }>
}

const monthDiff = (startDate: Date, endDate: Date) =>
  (endDate.getFullYear() - startDate.getFullYear()) * 12 +
  endDate.getMonth() -
  startDate.getMonth() +
  1

const mockPriceForMonth = (index: number, tickerSeed: number) => {
  const trend = 100 * Math.pow(1 + 0.085 / 12, index)
  const cycle = Math.sin((index + tickerSeed) * 0.7) * 0.05
  const longCycle = Math.cos((index + tickerSeed) * 0.17) * 0.08
  return Math.max(trend * (1 + cycle + longCycle), 5)
}

export const calculateMockDca = (ticker: string, amount: number, from: string): DcaResult => {
  const normalizedTicker = ticker.toUpperCase()
  const start = new Date(`${from}-01T00:00:00.000Z`)
  const today = new Date()
  const months = Math.max(monthDiff(start, today), 1)
  const tickerSeed = normalizedTicker
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  let invested = 0
  let shares = 0
  const rows: DcaResult['rows'] = []

  for (let index = 0; index < months; index += 1) {
    const date = new Date(start)
    date.setUTCMonth(start.getUTCMonth() + index)
    const price = mockPriceForMonth(index, tickerSeed)
    invested += amount
    shares += amount / price
    rows.push({
      date: date.toISOString().slice(0, 10),
      price,
      invested,
      shares,
      portfolioValue: shares * price,
    })
  }

  const finalValue = rows.at(-1)?.portfolioValue ?? 0
  return {
    ticker: normalizedTicker,
    amount,
    invested,
    shares,
    portfolioValue: finalValue,
    profit: finalValue - invested,
    returnPercent: invested > 0 ? ((finalValue - invested) / invested) * 100 : 0,
    averagePrice: shares > 0 ? invested / shares : 0,
    source: 'mock',
    rows,
  }
}

export const calculateDca = (
  ticker: string,
  amount: number,
  history: StockHistory,
  from: string,
): DcaResult => {
  let invested = 0
  let shares = 0
  const rows: DcaResult['rows'] = []

  history.dates.forEach((date, index) => {
    if (date.slice(0, 7) < from) {
      return
    }

    const price = history.prices[index]
    if (!price || price <= 0) {
      return
    }

    invested += amount
    shares += amount / price
    rows.push({
      date,
      price,
      invested,
      shares,
      portfolioValue: shares * price,
    })
  })

  const finalValue = rows.at(-1)?.portfolioValue ?? 0
  return {
    ticker: ticker.toUpperCase(),
    amount,
    invested,
    shares,
    portfolioValue: finalValue,
    profit: finalValue - invested,
    returnPercent: invested > 0 ? ((finalValue - invested) / invested) * 100 : 0,
    averagePrice: shares > 0 ? invested / shares : 0,
    source: 'live',
    rows,
  }
}
