import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  FMP_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => c.json({ status: 'ok', project: 'Lucrum API' }))

export default app
