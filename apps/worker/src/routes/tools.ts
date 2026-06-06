import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { logToolUsage } from '../db/queries'
import { getOptionalUser } from '../middleware/auth'
import { CacheTtl, getJsonCache, putJsonCache } from '../services/cache'
import { getFmpHistoricalPrices, getFmpQuote } from '../services/fmp'
import { getFinnhubQuote } from '../services/finnhub'
import { getStooqQuote } from '../services/stooq'
import { getYahooHistory, getYahooQuote, type StockHistory, type StockQuote } from '../services/yahoo'
import type { AppEnv } from '../types'
import { getToolUsageAnalytics } from '../utils/analytics'
import { calculateDca } from '../utils/dca'
import { createError, createSuccess } from '../utils/response'
import { normalizeTicker } from '../utils/ticker'

const tools = new Hono<AppEnv>()

const stockHistorySchema = z.object({
  ticker: z.string().min(1).max(12),
  period: z.string().min(2).max(10).default('5y'),
})

const quoteSchema = z.object({
  ticker: z.string().min(1).max(12),
})

const dcaSchema = z.object({
  ticker: z.string().min(1).max(12),
  from: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.coerce.number().positive().max(1_000_000),
})

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

const logUsage = async (c: Context, toolType: string, ticker: string | null) => {
  const user = await getOptionalUser(c)
  await logToolUsage(c.env.DB, {
    userId: user?.id ?? null,
    toolType,
    ticker,
    ...getToolUsageAnalytics(c),
  })
}

const hasSecret = (value: string | undefined) => typeof value === 'string' && value.trim() !== ''

const hasQuoteRange = (quote: StockQuote | null) =>
  Boolean(
    quote &&
      typeof quote.fiftyTwoWeekHigh === 'number' &&
      typeof quote.fiftyTwoWeekLow === 'number',
  )

const mergeQuote = (primary: StockQuote, fallback: StockQuote): StockQuote => ({
  ...primary,
  currency: primary.currency ?? fallback.currency,
  marketTime: primary.marketTime ?? fallback.marketTime,
  fiftyTwoWeekHigh: primary.fiftyTwoWeekHigh ?? fallback.fiftyTwoWeekHigh,
  fiftyTwoWeekLow: primary.fiftyTwoWeekLow ?? fallback.fiftyTwoWeekLow,
  change: primary.change ?? fallback.change,
  changePercent: primary.changePercent ?? fallback.changePercent,
  dayHigh: primary.dayHigh ?? fallback.dayHigh,
  dayLow: primary.dayLow ?? fallback.dayLow,
  previousClose: primary.previousClose ?? fallback.previousClose,
  shortName: primary.shortName ?? fallback.shortName,
  longName: primary.longName ?? fallback.longName,
  exchangeName: primary.exchangeName ?? fallback.exchangeName,
  quoteType: primary.quoteType ?? fallback.quoteType,
})

const enrichQuote = async (quote: StockQuote, c: Context, ticker: string) => {
  if (hasQuoteRange(quote) && quote.longName && quote.quoteType) {
    return quote
  }

  let enrichedQuote = quote
  try {
    enrichedQuote = mergeQuote(
      enrichedQuote,
      await getYahooQuote(c.env.YAHOO_FINANCE_BASE_URL, ticker),
    )
  } catch {
    // Keep the primary quote and try the next lightweight provider.
  }

  if (hasQuoteRange(enrichedQuote)) {
    return enrichedQuote
  }

  try {
    return mergeQuote(enrichedQuote, await getFmpQuote(ticker, c.env.FMP_API_KEY))
  } catch {
    return enrichedQuote
  }
}

const periodToFromDate = (period: string) => {
  const match = /^(\d+)([ym])$/.exec(period)
  const date = new Date()
  if (!match) {
    date.setFullYear(date.getFullYear() - 5)
    return date.toISOString().slice(0, 10)
  }

  const amount = Number(match[1])
  const unit = match[2]
  if (unit === 'y') {
    date.setFullYear(date.getFullYear() - amount)
  } else {
    date.setMonth(date.getMonth() - amount)
  }

  return date.toISOString().slice(0, 10)
}

const getHistory = async (c: Context, ticker: string, period: string) => {
  const normalizedTicker = normalizeTicker(ticker)
  const cacheKey = `history:${normalizedTicker}:${period}`
  const cached = await getJsonCache<StockHistory>(c.env.KV, cacheKey)
  if (cached) {
    return cached
  }

  let history: StockHistory
  try {
    history = await getFmpHistoricalPrices(
      normalizedTicker,
      c.env.FMP_API_KEY,
      periodToFromDate(period),
    )
  } catch {
    history = await getYahooHistory(c.env.YAHOO_FINANCE_BASE_URL, normalizedTicker, period)
  }

  await putJsonCache(c.env.KV, cacheKey, history, CacheTtl.history)
  return history
}

const getQuote = async (c: Context, ticker: string) => {
  const normalizedTicker = normalizeTicker(ticker)
  const cacheKey = `quote:${normalizedTicker}`
  const cached = await getJsonCache<StockQuote>(c.env.KV, cacheKey)
  if (cached) {
    const enrichedCached = await enrichQuote(cached, c, normalizedTicker)
    if (enrichedCached !== cached) {
      await putJsonCache(c.env.KV, cacheKey, enrichedCached, CacheTtl.quote)
    }
    return enrichedCached
  }

  let quote: StockQuote
  try {
    if (!hasSecret(c.env.FINNHUB_API_KEY)) {
      throw new Error('missing_api_key')
    }
    quote = await getFinnhubQuote(normalizedTicker, c.env.FINNHUB_API_KEY)
    quote = await enrichQuote(quote, c, normalizedTicker)
  } catch {
    try {
      quote = await getYahooQuote(c.env.YAHOO_FINANCE_BASE_URL, normalizedTicker)
    } catch {
      try {
        quote = await getFmpQuote(normalizedTicker, c.env.FMP_API_KEY)
      } catch {
        quote = await getStooqQuote(normalizedTicker)
      }
    }
  }

  await putJsonCache(c.env.KV, cacheKey, quote, CacheTtl.quote)
  return quote
}

tools.get('/stock-history', zValidator('query', stockHistorySchema, validatorHook), async (c) => {
  const { ticker, period } = c.req.valid('query')
  const normalizedTicker = normalizeTicker(ticker)
  c.executionCtx.waitUntil(logUsage(c, 'STOCK_HISTORY', normalizedTicker).catch(() => undefined))

  try {
    const history = await getHistory(c, normalizedTicker, period)
    return c.json(createSuccess(history))
  } catch {
    return c.json(createError('HISTORY_FETCH_FAILED', 'Stock history fetch failed'), 502)
  }
})

tools.get('/quote', zValidator('query', quoteSchema, validatorHook), async (c) => {
  const { ticker } = c.req.valid('query')
  const normalizedTicker = normalizeTicker(ticker)
  c.executionCtx.waitUntil(logUsage(c, 'QUOTE', normalizedTicker).catch(() => undefined))

  try {
    const quote = await getQuote(c, normalizedTicker)
    return c.json(createSuccess(quote))
  } catch {
    return c.json(createError('QUOTE_FETCH_FAILED', 'Quote fetch failed'), 502)
  }
})

tools.get('/dca', zValidator('query', dcaSchema, validatorHook), async (c) => {
  const { ticker, from, amount } = c.req.valid('query')
  const normalizedTicker = normalizeTicker(ticker)
  c.executionCtx.waitUntil(logUsage(c, 'DCA', normalizedTicker).catch(() => undefined))

  try {
    const history = await getHistory(c, normalizedTicker, '10y')
    const result = calculateDca(normalizedTicker, amount, history, from)
    if (result.rows.length === 0) {
      return c.json(
        createError('DCA_HISTORY_UNAVAILABLE', 'No historical prices found for this ticker.'),
        404,
      )
    }

    return c.json(createSuccess(result))
  } catch {
    return c.json(
      createError('DCA_HISTORY_UNAVAILABLE', 'No historical prices found for this ticker.'),
      404,
    )
  }
})

export default tools
