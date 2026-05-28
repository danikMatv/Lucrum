import type { StockQuote } from './yahoo'

const stooqBaseUrl = 'https://stooq.com'

const parseCsvLine = (line: string) => line.split(',').map((value) => value.trim())

export const getStooqQuote = async (ticker: string): Promise<StockQuote> => {
  const normalizedTicker = ticker.toUpperCase()
  const url = new URL('/q/l/', stooqBaseUrl)
  url.searchParams.set('s', `${normalizedTicker.toLowerCase()}.us`)
  url.searchParams.set('f', 'sd2t2ohlcv')
  url.searchParams.set('h', '')
  url.searchParams.set('e', 'csv')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Stooq quote request failed with ${response.status}`)
  }

  const csv = await response.text()
  const [, row] = csv.trim().split(/\r?\n/)
  if (!row) {
    throw new Error('Stooq returned no quote row')
  }

  const [symbol, date, time, , , , close] = parseCsvLine(row)
  const price = Number(close)
  if (!symbol || typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error('Stooq returned no quote price')
  }

  return {
    ticker: normalizedTicker,
    price,
    currency: 'USD',
    marketTime: date && time ? new Date(`${date}T${time}Z`).toISOString() : null,
  }
}
