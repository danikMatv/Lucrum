import { createMiddleware } from 'hono/factory'
import type { AppEnv, UserRole } from '../types'
import { createError } from '../utils/response'

const roleLevels: Record<UserRole, number> = {
  USER: 1,
  USER_PRO: 2,
  MODERATOR: 3,
  ADMIN: 4,
}

export const roleMiddleware = (role: UserRole) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (user.role !== role) {
      return c.json(createError('FORBIDDEN', 'Insufficient permissions'), 403)
    }

    await next()
  })

export const requireMinRole = (minRole: UserRole) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (roleLevels[user.role] < roleLevels[minRole]) {
      return c.json(createError('FORBIDDEN', 'Insufficient permissions'), 403)
    }

    await next()
  })
