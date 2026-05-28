import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { AppEnv, AuthUser } from '../types'
import { createError } from '../utils/response'
import { verifyJwt } from '../utils/jwt'

const getBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }
  return authorization.slice('Bearer '.length)
}

type AppContext = Context<AppEnv>

export const getTokenFromRequest = (c: AppContext) =>
  getBearerToken(c.req.header('Authorization')) ?? getCookie(c, 'access_token') ?? null

export const getOptionalUser = async (c: AppContext): Promise<AuthUser | null> => {
  const token = getTokenFromRequest(c)
  if (!token) {
    return null
  }

  try {
    return await verifyJwt(token, c.env.JWT_SECRET, 'access')
  } catch {
    return null
  }
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getTokenFromRequest(c)
  if (!token) {
    return c.json(createError('UNAUTHORIZED', 'Authentication is required'), 401)
  }

  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET, 'access')
    const user: AuthUser = {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
    }
    c.set('user', user)
    await next()
  } catch {
    return c.json(createError('UNAUTHORIZED', 'Invalid or expired token'), 401)
  }
})
