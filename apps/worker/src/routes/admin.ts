import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  getNewUsersByDate,
  getToolUsageByDate,
  getTopBrowsers,
  getTopCountries,
  getTopDevices,
  getTopLanguages,
  getTopOperatingSystems,
  getTopSources,
  getTopTickers,
  getTopTools,
  getToolAudienceStats,
  getUsersByActiveState,
  getUsersByRole,
  getUsersCount,
  listUsers,
  updateUserActiveState,
  updateUserRole,
} from '../db/queries'
import { authMiddleware } from '../middleware/auth'
import { roleMiddleware } from '../middleware/role'
import type { AppEnv } from '../types'
import { UserRole } from '../types'
import { createError, createSuccess } from '../utils/response'

const admin = new Hono<AppEnv>()

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

const roleSchema = z.object({
  role: z.enum([UserRole.USER, UserRole.USER_PRO, UserRole.MODERATOR, UserRole.ADMIN]),
})

const activeSchema = z.object({
  isActive: z.boolean(),
})

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

admin.use('*', authMiddleware)
admin.use('*', roleMiddleware(UserRole.ADMIN))

admin.get('/stats/users', async (c) => {
  const [total, last7Days, last30Days, byRole, byActiveState] = await Promise.all([
    getUsersCount(c.env.DB),
    getNewUsersByDate(c.env.DB, 7),
    getNewUsersByDate(c.env.DB, 30),
    getUsersByRole(c.env.DB),
    getUsersByActiveState(c.env.DB),
  ])

  return c.json(
    createSuccess({
      total: total?.count ?? 0,
      newUsersLast7Days: last7Days,
      newUsersLast30Days: last30Days,
      breakdownByRole: byRole,
      activeVsInactive: byActiveState,
    }),
  )
})

admin.get('/stats/tools', async (c) => c.json(createSuccess(await getTopTools(c.env.DB))))

admin.get('/stats/tickers', async (c) => c.json(createSuccess(await getTopTickers(c.env.DB))))

admin.get('/stats/usage/daily', async (c) =>
  c.json(createSuccess(await getToolUsageByDate(c.env.DB, 30))),
)

admin.get('/stats/usage/audience', async (c) =>
  c.json(createSuccess(await getToolAudienceStats(c.env.DB))),
)

admin.get('/stats/sources', async (c) => c.json(createSuccess(await getTopSources(c.env.DB))))

admin.get('/stats/locations', async (c) => c.json(createSuccess(await getTopCountries(c.env.DB))))

admin.get('/stats/devices', async (c) => c.json(createSuccess(await getTopDevices(c.env.DB))))

admin.get('/stats/browsers', async (c) => c.json(createSuccess(await getTopBrowsers(c.env.DB))))

admin.get('/stats/os', async (c) =>
  c.json(createSuccess(await getTopOperatingSystems(c.env.DB))),
)

admin.get('/stats/languages', async (c) =>
  c.json(createSuccess(await getTopLanguages(c.env.DB))),
)

admin.get('/users', zValidator('query', paginationSchema, validatorHook), async (c) => {
  const { page, limit } = c.req.valid('query')
  return c.json(createSuccess(await listUsers(c.env.DB, page, limit)))
})

admin.patch(
  '/users/:id/role',
  zValidator('param', idParamSchema, validatorHook),
  zValidator('json', roleSchema, validatorHook),
  async (c) => {
    const { id } = c.req.valid('param')
    const { role } = c.req.valid('json')
    await updateUserRole(c.env.DB, id, role)
    return c.json(createSuccess({ updated: true }))
  },
)

admin.patch(
  '/users/:id/active',
  zValidator('param', idParamSchema, validatorHook),
  zValidator('json', activeSchema, validatorHook),
  async (c) => {
    const { id } = c.req.valid('param')
    const { isActive } = c.req.valid('json')
    await updateUserActiveState(c.env.DB, id, isActive)
    return c.json(createSuccess({ updated: true }))
  },
)

export default admin
