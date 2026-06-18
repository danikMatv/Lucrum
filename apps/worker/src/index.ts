import { Hono } from 'hono'
import { cors } from 'hono/cors'
import admin from './routes/admin'
import auth from './routes/auth'
import companies from './routes/companies'
import dashboard from './routes/dashboard'
import learn from './routes/learn'
import learnProgress from './routes/learnProgress'
import tools from './routes/tools'
import type { AppEnv } from './types'
import { createError } from './utils/response'

const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigins = new Set([
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        c.env.FRONTEND_ORIGIN,
      ])
      return allowedOrigins.has(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Lucrum-Campaign',
      'X-Lucrum-Language',
      'X-Lucrum-Medium',
      'X-Lucrum-Page-Path',
      'X-Lucrum-Referrer',
      'X-Lucrum-Source',
    ],
    credentials: true,
  }),
)

app.get('/', (c) => c.json({ status: 'ok', project: 'Lucrum API' }))

app.route('/api/auth', auth)
app.route('/api/companies', companies)
app.route('/api/tools', tools)
app.route('/api/learn', learnProgress)
app.route('/api/learn', learn)
app.route('/api/dashboard', dashboard)
app.route('/api/admin', admin)

app.notFound((c) => c.json(createError('NOT_FOUND', 'Route not found'), 404))

app.onError((error, c) => {
  return c.json(createError('INTERNAL_ERROR', error.message || 'Internal server error'), 500)
})

export default app
