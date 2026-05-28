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
  rows: Array<{
    date: string
    price: number
    invested: number
    shares: number
    portfolioValue: number
  }>
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
    rows,
  }
}
