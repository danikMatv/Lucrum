import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { logToolUsage } from '../db/queries'
import { getOptionalUser } from '../middleware/auth'
import { CacheTtl, getJsonCache, putJsonCache } from '../services/cache'
import { getYahooHistory, type StockHistory } from '../services/yahoo'
import type { AppEnv } from '../types'
import { calculateDca } from '../utils/dca'
import { createError, createSuccess } from '../utils/response'

const tools = new Hono<AppEnv>()

const stockHistorySchema = z.object({
  ticker: z.string().min(1).max(12),
  period: z.string().min(2).max(10).default('5y'),
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
  await logToolUsage(c.env.DB, { userId: user?.id ?? null, toolType, ticker })
}

const getHistory = async (c: Context, ticker: string, period: string) => {
  const normalizedTicker = ticker.toUpperCase()
  const cacheKey = `history:${normalizedTicker}:${period}`
  const cached = await getJsonCache<StockHistory>(c.env.KV, cacheKey)
  if (cached) {
    return cached
  }

  const history = await getYahooHistory(c.env.YAHOO_FINANCE_BASE_URL, normalizedTicker, period)
  await putJsonCache(c.env.KV, cacheKey, history, CacheTtl.history)
  return history
}

tools.get('/stock-history', zValidator('query', stockHistorySchema, validatorHook), async (c) => {
  const { ticker, period } = c.req.valid('query')
  const normalizedTicker = ticker.toUpperCase()
  c.executionCtx.waitUntil(logUsage(c, 'STOCK_HISTORY', normalizedTicker).catch(() => undefined))

  try {
    const history = await getHistory(c, normalizedTicker, period)
    return c.json(createSuccess(history))
  } catch {
    return c.json(createError('HISTORY_FETCH_FAILED', 'Stock history fetch failed'), 502)
  }
})

tools.get('/dca', zValidator('query', dcaSchema, validatorHook), async (c) => {
  const { ticker, from, amount } = c.req.valid('query')
  const normalizedTicker = ticker.toUpperCase()
  c.executionCtx.waitUntil(logUsage(c, 'DCA', normalizedTicker).catch(() => undefined))

  try {
    const history = await getHistory(c, normalizedTicker, '10y')
    return c.json(createSuccess(calculateDca(normalizedTicker, amount, history, from)))
  } catch {
    return c.json(createError('DCA_FAILED', 'DCA simulation failed'), 502)
  }
})

export default tools
