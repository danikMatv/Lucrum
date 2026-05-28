export interface DcaInput {
  ticker: string
  monthlyInvestment: number
  startDate: string
  inflationPercent: number
}

export interface DcaMonthResult {
  label: string
  price: number
  shares: number
  invested: number
  portfolioValue: number
  realPortfolioValue: number
}

export interface DcaResult {
  ticker: string
  rows: DcaMonthResult[]
  invested: number
  portfolioValue: number
  profit: number
  returnPercent: number
  averagePrice: number
  shares: number
  finalPrice: number
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

export const calculateDcaSimulation = (input: DcaInput): DcaResult => {
  const today = new Date()
  const start = new Date(`${input.startDate}-01T00:00:00`)
  const months = Math.max(monthDiff(start, today), 1)
  const tickerSeed = input.ticker
    .toUpperCase()
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  let shares = 0
  let invested = 0
  const rows: DcaMonthResult[] = []

  for (let index = 0; index < months; index += 1) {
    const date = new Date(start)
    date.setMonth(start.getMonth() + index)
    const price = mockPriceForMonth(index, tickerSeed)
    const purchasedShares = input.monthlyInvestment / price
    shares += purchasedShares
    invested += input.monthlyInvestment
    const portfolioValue = shares * price
    const realPortfolioValue =
      portfolioValue / Math.pow(1 + input.inflationPercent / 100, index / 12)

    rows.push({
      label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      price,
      shares,
      invested,
      portfolioValue,
      realPortfolioValue,
    })
  }

  const lastRow = rows.at(-1)
  const portfolioValue = lastRow?.portfolioValue ?? 0

  return {
    ticker: input.ticker.toUpperCase(),
    rows,
    invested,
    portfolioValue,
    profit: portfolioValue - invested,
    returnPercent: invested > 0 ? ((portfolioValue - invested) / invested) * 100 : 0,
    averagePrice: shares > 0 ? invested / shares : 0,
    shares,
    finalPrice: lastRow?.price ?? 0,
  }
}
