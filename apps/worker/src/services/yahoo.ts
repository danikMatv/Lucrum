export interface StockHistory {
  dates: string[]
  prices: number[]
}

export interface StockQuote {
  ticker: string
  price: number
  currency: string | null
  marketTime: string | null
  fiftyTwoWeekHigh?: number | null
  fiftyTwoWeekLow?: number | null
  change?: number | null
  changePercent?: number | null
  dayHigh?: number | null
  dayLow?: number | null
  previousClose?: number | null
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string
        regularMarketPrice?: number
        previousClose?: number
        currency?: string
        regularMarketTime?: number
        fiftyTwoWeekHigh?: number
        fiftyTwoWeekLow?: number
        regularMarketChange?: number
        regularMarketChangePercent?: number
      }
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

export const getYahooQuote = async (baseUrl: string, ticker: string): Promise<StockQuote> => {
  const normalizedTicker = ticker.toUpperCase()
  const url = new URL(`/v8/finance/chart/${normalizedTicker}`, baseUrl)
  url.searchParams.set('range', '1d')
  url.searchParams.set('interval', '1d')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Yahoo Finance quote request failed with ${response.status}`)
  }

  const data = (await response.json()) as YahooChartResponse
  const meta = data.chart?.result?.at(0)?.meta
  const price = meta?.regularMarketPrice ?? meta?.previousClose
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error('Yahoo Finance returned no quote price')
  }

  return {
    ticker: meta?.symbol?.toUpperCase() ?? normalizedTicker,
    price,
    currency: meta?.currency ?? null,
    marketTime: meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : null,
    fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta?.fiftyTwoWeekLow ?? null,
    change: meta?.regularMarketChange ?? null,
    changePercent: meta?.regularMarketChangePercent ?? null,
  }
}
