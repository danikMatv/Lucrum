import type {
  AuthUser,
  Company,
  CompanyFundamentals,
  SavedCalculation,
  UserRole,
  WatchlistItem,
} from '../types'

interface UserRow {
  id: string
  email: string
  password_hash: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  is_active: number
  created_at: string
  updated_at: string
}

interface CompanyRow {
  id: string
  ticker: string
  name: string
  exchange: string | null
  sector: string | null
  industry: string | null
  description: string | null
  last_synced_at: string | null
  created_at: string
}

interface CompanyFundamentalsRow {
  id: string
  company_id: string
  eps_ttm: number | null
  revenue: number | null
  net_income: number | null
  free_cash_flow: number | null
  pe_ratio: number | null
  market_cap: number | null
  dividend_yield: number | null
  debt_to_equity: number | null
  recorded_date: string | null
  created_at: string
}

interface SavedCalculationRow {
  id: string
  user_id: string
  tool_type: string
  input_params: string
  result_snapshot: string
  created_at: string
}

interface WatchlistRow {
  id: string
  user_id: string
  ticker: string
  company_name: string | null
  added_at: string
}

interface CountRow {
  count: number
}

interface DateCountRow {
  date: string
  count: number
}

interface RoleCountRow {
  role: UserRole
  count: number
}

const nowIso = () => new Date().toISOString()

export const mapUser = (row: UserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  role: row.role,
})

export const mapCompany = (row: CompanyRow): Company => ({
  id: row.id,
  ticker: row.ticker,
  name: row.name,
  exchange: row.exchange,
  sector: row.sector,
  industry: row.industry,
  description: row.description,
  lastSyncedAt: row.last_synced_at,
  createdAt: row.created_at,
})

export const mapFundamentals = (row: CompanyFundamentalsRow): CompanyFundamentals => ({
  id: row.id,
  companyId: row.company_id,
  epsTtm: row.eps_ttm,
  revenue: row.revenue,
  netIncome: row.net_income,
  freeCashFlow: row.free_cash_flow,
  peRatio: row.pe_ratio,
  marketCap: row.market_cap,
  dividendYield: row.dividend_yield,
  debtToEquity: row.debt_to_equity,
  recordedDate: row.recorded_date,
  createdAt: row.created_at,
})

const mapSavedCalculation = (row: SavedCalculationRow): SavedCalculation => ({
  id: row.id,
  userId: row.user_id,
  toolType: row.tool_type,
  inputParams: row.input_params,
  resultSnapshot: row.result_snapshot,
  createdAt: row.created_at,
})

const mapWatchlistItem = (row: WatchlistRow): WatchlistItem => ({
  id: row.id,
  userId: row.user_id,
  ticker: row.ticker,
  companyName: row.company_name,
  addedAt: row.added_at,
})

export const getUserByEmail = async (db: D1Database, email: string) =>
  db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<UserRow>()

export const getUserById = async (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').bind(id).first<UserRow>()

export const createUser = async (
  db: D1Database,
  input: {
    email: string
    passwordHash: string
    firstName: string | null
    lastName: string | null
  },
) => {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  await db
    .prepare(
      'INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      input.email.toLowerCase(),
      input.passwordHash,
      input.firstName,
      input.lastName,
      'USER',
      1,
      createdAt,
      createdAt,
    )
    .run()

  const user = await getUserById(db, id)
  if (!user) {
    throw new Error('User creation failed')
  }
  return user
}

export const searchCompaniesInDb = async (db: D1Database, query: string) => {
  const likeQuery = `%${query.toUpperCase()}%`
  const result = await db
    .prepare('SELECT * FROM companies WHERE ticker LIKE ? OR name LIKE ? LIMIT 10')
    .bind(likeQuery, `%${query}%`)
    .all<CompanyRow>()
  return result.results.map(mapCompany)
}

export const getCompanyByTicker = async (db: D1Database, ticker: string) => {
  const row = await db
    .prepare('SELECT * FROM companies WHERE ticker = ?')
    .bind(ticker.toUpperCase())
    .first<CompanyRow>()
  return row ? mapCompany(row) : null
}

export const upsertCompany = async (db: D1Database, company: Company) => {
  await db
    .prepare(
      'INSERT INTO companies (id, ticker, name, exchange, sector, industry, description, last_synced_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ticker) DO UPDATE SET name = excluded.name, exchange = excluded.exchange, sector = excluded.sector, industry = excluded.industry, description = excluded.description, last_synced_at = excluded.last_synced_at',
    )
    .bind(
      company.id,
      company.ticker,
      company.name,
      company.exchange,
      company.sector,
      company.industry,
      company.description,
      company.lastSyncedAt,
      company.createdAt,
    )
    .run()
}

export const getFundamentalsByTicker = async (db: D1Database, ticker: string) => {
  const row = await db
    .prepare(
      'SELECT f.* FROM company_fundamentals f JOIN companies c ON c.id = f.company_id WHERE c.ticker = ? ORDER BY f.created_at DESC LIMIT 1',
    )
    .bind(ticker.toUpperCase())
    .first<CompanyFundamentalsRow>()
  return row ? mapFundamentals(row) : null
}

export const upsertFundamentals = async (db: D1Database, fundamentals: CompanyFundamentals) => {
  await db
    .prepare(
      'INSERT INTO company_fundamentals (id, company_id, eps_ttm, revenue, net_income, free_cash_flow, pe_ratio, market_cap, dividend_yield, debt_to_equity, recorded_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      fundamentals.id,
      fundamentals.companyId,
      fundamentals.epsTtm,
      fundamentals.revenue,
      fundamentals.netIncome,
      fundamentals.freeCashFlow,
      fundamentals.peRatio,
      fundamentals.marketCap,
      fundamentals.dividendYield,
      fundamentals.debtToEquity,
      fundamentals.recordedDate,
      fundamentals.createdAt,
    )
    .run()
}

export const listSavedCalculations = async (db: D1Database, userId: string) => {
  const result = await db
    .prepare('SELECT * FROM saved_calculations WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<SavedCalculationRow>()
  return result.results.map(mapSavedCalculation)
}

export const createSavedCalculation = async (
  db: D1Database,
  input: { userId: string; toolType: string; inputParams: string; resultSnapshot: string },
) => {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  await db
    .prepare(
      'INSERT INTO saved_calculations (id, user_id, tool_type, input_params, result_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(id, input.userId, input.toolType, input.inputParams, input.resultSnapshot, createdAt)
    .run()
  return { id, userId: input.userId, toolType: input.toolType, inputParams: input.inputParams, resultSnapshot: input.resultSnapshot, createdAt }
}

export const deleteSavedCalculation = async (db: D1Database, userId: string, id: string) =>
  db.prepare('DELETE FROM saved_calculations WHERE id = ? AND user_id = ?').bind(id, userId).run()

export const listWatchlist = async (db: D1Database, userId: string) => {
  const result = await db
    .prepare('SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC')
    .bind(userId)
    .all<WatchlistRow>()
  return result.results.map(mapWatchlistItem)
}

export const addWatchlistItem = async (
  db: D1Database,
  input: { userId: string; ticker: string; companyName: string | null },
) => {
  const id = crypto.randomUUID()
  const addedAt = nowIso()
  await db
    .prepare('INSERT INTO watchlist (id, user_id, ticker, company_name, added_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, input.userId, input.ticker.toUpperCase(), input.companyName, addedAt)
    .run()
  return { id, userId: input.userId, ticker: input.ticker.toUpperCase(), companyName: input.companyName, addedAt }
}

export const deleteWatchlistItem = async (db: D1Database, userId: string, ticker: string) =>
  db
    .prepare('DELETE FROM watchlist WHERE user_id = ? AND ticker = ?')
    .bind(userId, ticker.toUpperCase())
    .run()

export const logToolUsage = async (
  db: D1Database,
  input: { userId: string | null; toolType: string; ticker: string | null },
) =>
  db
    .prepare(
      'INSERT INTO tool_usage_events (id, user_id, tool_type, ticker, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), input.userId, input.toolType, input.ticker, nowIso())
    .run()

export const getUsersCount = async (db: D1Database) =>
  db.prepare('SELECT COUNT(*) AS count FROM users').first<CountRow>()

export const getUsersByRole = async (db: D1Database) => {
  const result = await db
    .prepare('SELECT role, COUNT(*) AS count FROM users GROUP BY role')
    .all<RoleCountRow>()
  return result.results
}

export const getUsersByActiveState = async (db: D1Database) => {
  const active = await db
    .prepare('SELECT COUNT(*) AS count FROM users WHERE is_active = 1')
    .first<CountRow>()
  const inactive = await db
    .prepare('SELECT COUNT(*) AS count FROM users WHERE is_active = 0')
    .first<CountRow>()
  return { active: active?.count ?? 0, inactive: inactive?.count ?? 0 }
}

export const getNewUsersByDate = async (db: D1Database, days: number) => {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - (days - 1))
  since.setUTCHours(0, 0, 0, 0)
  const result = await db
    .prepare(
      'SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count FROM users WHERE created_at >= ? GROUP BY date',
    )
    .bind(since.toISOString())
    .all<DateCountRow>()
  const counts = new Map(result.results.map((row) => [row.date, row.count]))

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since)
    date.setUTCDate(since.getUTCDate() + index)
    const label = date.toISOString().slice(0, 10)
    return { date: label, count: counts.get(label) ?? 0 }
  })
}

export const getTopTools = async (db: D1Database) => {
  const result = await db
    .prepare('SELECT tool_type AS toolType, COUNT(*) AS count FROM tool_usage_events GROUP BY tool_type ORDER BY count DESC LIMIT 10')
    .all<{ toolType: string; count: number }>()
  return result.results
}

export const getTopTickers = async (db: D1Database) => {
  const result = await db
    .prepare('SELECT ticker, COUNT(*) AS count FROM tool_usage_events WHERE ticker IS NOT NULL GROUP BY ticker ORDER BY count DESC LIMIT 20')
    .all<{ ticker: string; count: number }>()
  return result.results
}

export const listUsers = async (db: D1Database, page: number, limit: number) => {
  const offset = (page - 1) * limit
  const result = await db
    .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<UserRow>()
  return result.results.map((row) => ({ ...mapUser(row), isActive: row.is_active === 1, createdAt: row.created_at }))
}

export const updateUserRole = async (db: D1Database, id: string, role: UserRole) =>
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, nowIso(), id).run()

export const updateUserActiveState = async (db: D1Database, id: string, isActive: boolean) =>
  db
    .prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(isActive ? 1 : 0, nowIso(), id)
    .run()
