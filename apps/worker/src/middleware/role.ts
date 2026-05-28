import { createMiddleware } from 'hono/factory'
import type { AppEnv, UserRole } from '../types'
import { createError } from '../utils/response'

export const roleMiddleware = (role: UserRole) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (user.role !== role) {
      return c.json(createError('FORBIDDEN', 'Insufficient permissions'), 403)
    }

    await next()
  })
