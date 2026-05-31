export const UserRole = {
  USER: 'USER',
  USER_PRO: 'USER_PRO',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export interface ApiError {
  code: string
  message: string
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
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
  sharesOutstanding?: number | null
  annualFinancials?: CompanyAnnualFinancial[]
}

export interface CompanyAnnualFinancial {
  year: string
  revenue: number | null
  netIncome: number | null
}

export interface StockHistory {
  dates: string[]
  prices: number[]
}

export interface StockQuote {
  ticker: string
  price: number
  currency: string | null
  marketTime: string | null
  fiftyTwoWeekHigh?: number | null
  fiftyTwoWeekLow?: number | null
}

export interface CompanySnapshot {
  ticker: string
  company: Company | null
  fundamentals: CompanyFundamentals | null
  quote: StockQuote | null
  fetchedAt: {
    company: string | null
    fundamentals: string | null
    quote: string | null
  }
  freshness: {
    company: 'fresh' | 'stale' | 'missing'
    fundamentals: 'fresh' | 'stale' | 'missing'
    quote: 'fresh' | 'missing'
  }
  missing: Array<'company' | 'fundamentals' | 'quote'>
}

export interface DcaResult {
  ticker: string
  amount: number
  invested: number
  shares: number
  portfolioValue: number
  profit: number
  returnPercent: number
  averagePrice: number
  source?: 'live' | 'mock'
  rows: Array<{
    date: string
    price: number
    invested: number
    shares: number
    portfolioValue: number
  }>
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
