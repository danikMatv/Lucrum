export const UserRole = {
  USER: 'USER',
  USER_PRO: 'USER_PRO',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  FMP_API_KEY: string
  YAHOO_FINANCE_BASE_URL: string
  FRONTEND_ORIGIN: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
}

export type AppEnv = {
  Bindings: Bindings
  Variables: {
    user: AuthUser
  }
}

export interface Company {
  id: string
  ticker: string
  name: string
  exchange: string | null
  sector: string | null
  industry: string | null
  description: string | null
  lastSyncedAt: string | null
  createdAt: string
}

export interface CompanyFundamentals {
  id: string
  companyId: string
  epsTtm: number | null
  revenue: number | null
  netIncome: number | null
  freeCashFlow: number | null
  peRatio: number | null
  marketCap: number | null
  dividendYield: number | null
  debtToEquity: number | null
  recordedDate: string | null
  createdAt: string
}

export interface SavedCalculation {
  id: string
  userId: string
  toolType: string
  inputParams: string
  resultSnapshot: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  userId: string
  ticker: string
  companyName: string | null
  addedAt: string
}

export type LearnResourceType = 'article' | 'video' | 'post' | 'podcast' | 'tool'

export interface LearnResource {
  id: string
  topic: string
  title: string
  url: string
  type: LearnResourceType
  description: string | null
  addedBy: string | null
  addedByName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
