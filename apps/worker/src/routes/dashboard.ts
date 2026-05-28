import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  addWatchlistItem,
  createSavedCalculation,
  deleteSavedCalculation,
  deleteWatchlistItem,
  listSavedCalculations,
  listWatchlist,
} from '../db/queries'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'
import { createError, createSuccess } from '../utils/response'

const dashboard = new Hono<AppEnv>()

const calculationSchema = z.object({
  toolType: z.string().min(1).max(50),
  inputParams: z.unknown(),
  resultSnapshot: z.unknown(),
})

const watchlistSchema = z.object({
  ticker: z.string().min(1).max(12),
  companyName: z.string().min(1).max(255).optional(),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

const tickerParamSchema = z.object({
  ticker: z.string().min(1).max(12),
})

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

dashboard.use('*', authMiddleware)

dashboard.get('/calculations', async (c) => {
  const user = c.get('user')
  return c.json(createSuccess(await listSavedCalculations(c.env.DB, user.id)))
})

dashboard.post('/calculations', zValidator('json', calculationSchema, validatorHook), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const calculation = await createSavedCalculation(c.env.DB, {
    userId: user.id,
    toolType: body.toolType,
    inputParams: JSON.stringify(body.inputParams),
    resultSnapshot: JSON.stringify(body.resultSnapshot),
  })
  return c.json(createSuccess(calculation), 201)
})

dashboard.delete('/calculations/:id', zValidator('param', idParamSchema, validatorHook), async (c) => {
  const user = c.get('user')
  const { id } = c.req.valid('param')
  await deleteSavedCalculation(c.env.DB, user.id, id)
  return c.json(createSuccess({ deleted: true }))
})

dashboard.get('/watchlist', async (c) => {
  const user = c.get('user')
  return c.json(createSuccess(await listWatchlist(c.env.DB, user.id)))
})

dashboard.post('/watchlist', zValidator('json', watchlistSchema, validatorHook), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const item = await addWatchlistItem(c.env.DB, {
    userId: user.id,
    ticker: body.ticker,
    companyName: body.companyName ?? null,
  })
  return c.json(createSuccess(item), 201)
})

dashboard.delete(
  '/watchlist/:ticker',
  zValidator('param', tickerParamSchema, validatorHook),
  async (c) => {
    const user = c.get('user')
    const { ticker } = c.req.valid('param')
    await deleteWatchlistItem(c.env.DB, user.id, ticker)
    return c.json(createSuccess({ deleted: true }))
  },
)

export default dashboard
