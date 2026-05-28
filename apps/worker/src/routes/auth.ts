import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'
import { createUser, getUserByEmail, getUserById, mapUser } from '../db/queries'
import { hashPassword, verifyPassword } from '../utils/hash'
import { signAccessToken, signRefreshToken, verifyJwt } from '../utils/jwt'
import { createError, createSuccess } from '../utils/response'

const auth = new Hono<AppEnv>()

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
})

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(100),
})

const validatorHook = (result: { success: boolean; error?: { message: string } }, c: Context) => {
  if (!result.success) {
    return c.json(createError('VALIDATION_ERROR', result.error?.message ?? 'Invalid request'), 400)
  }
}

const setAuthCookies = (c: Context, accessToken: string, refreshToken: string) => {
  const secure = new URL(c.req.url).protocol === 'https:'
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 15 * 60,
    path: '/',
  })
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
}

const clearAuthCookies = (c: Context) => {
  deleteCookie(c, 'access_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/' })
}

auth.post('/register', zValidator('json', registerSchema, validatorHook), async (c) => {
  const body = c.req.valid('json')
  const existingUser = await getUserByEmail(c.env.DB, body.email)
  if (existingUser) {
    return c.json(createError('EMAIL_EXISTS', 'A user with this email already exists'), 409)
  }

  const passwordHash = await hashPassword(body.password)
  const user = await createUser(c.env.DB, {
    email: body.email,
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
  })

  return c.json(createSuccess({ user: mapUser(user) }))
})

auth.post('/login', zValidator('json', loginSchema, validatorHook), async (c) => {
  const body = c.req.valid('json')
  const user = await getUserByEmail(c.env.DB, body.email)

  if (!user || user.is_active !== 1) {
    return c.json(createError('INVALID_CREDENTIALS', 'Invalid email or password'), 401)
  }

  const isValidPassword = await verifyPassword(body.password, user.password_hash)
  if (!isValidPassword) {
    return c.json(createError('INVALID_CREDENTIALS', 'Invalid email or password'), 401)
  }

  const authUser = mapUser(user)
  const accessToken = await signAccessToken(authUser, c.env.JWT_SECRET)
  const refreshToken = await signRefreshToken(authUser, c.env.JWT_SECRET)
  setAuthCookies(c, accessToken, refreshToken)

  return c.json(createSuccess({ user: authUser }))
})

auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')
  if (!refreshToken) {
    return c.json(createError('UNAUTHORIZED', 'Refresh token is required'), 401)
  }

  try {
    const payload = await verifyJwt(refreshToken, c.env.JWT_SECRET, 'refresh')
    const user = await getUserById(c.env.DB, payload.id)
    if (!user) {
      return c.json(createError('UNAUTHORIZED', 'User is inactive or missing'), 401)
    }

    const accessToken = await signAccessToken(mapUser(user), c.env.JWT_SECRET)
    setCookie(c, 'access_token', accessToken, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      maxAge: 15 * 60,
      path: '/',
    })
    return c.json(createSuccess({ refreshed: true }))
  } catch {
    return c.json(createError('UNAUTHORIZED', 'Invalid refresh token'), 401)
  }
})

auth.post('/logout', (c) => {
  clearAuthCookies(c)
  return c.json(createSuccess({ loggedOut: true }))
})

auth.get('/me', authMiddleware, (c) => c.json(createSuccess({ user: c.get('user') })))

export default auth
