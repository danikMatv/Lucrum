export interface StockHistory {
  dates: string[]
  prices: number[]
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
    error?: unknown
  }
}

export const getYahooHistory = async (
  baseUrl: string,
  ticker: string,
  period: string,
): Promise<StockHistory> => {
  const url = new URL(`/v8/finance/chart/${ticker.toUpperCase()}`, baseUrl)
  url.searchParams.set('range', period)
  url.searchParams.set('interval', '1mo')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed with ${response.status}`)
  }

  const data = (await response.json()) as YahooChartResponse
  const result = data.chart?.result?.at(0)
  const timestamps = result?.timestamp ?? []
  const prices = result?.indicators?.quote?.at(0)?.close ?? []

  const dates: string[] = []
  const validPrices: number[] = []

  timestamps.forEach((timestamp, index) => {
    const price = prices[index]
    if (typeof price === 'number' && Number.isFinite(price)) {
      dates.push(new Date(timestamp * 1000).toISOString().slice(0, 10))
      validPrices.push(price)
    }
  })

  return { dates, prices: validPrices }
}
