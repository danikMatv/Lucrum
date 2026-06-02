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

export interface AdminUser extends User {
  isActive: boolean
  createdAt: string
}

export interface CountByDate {
  date: string
  count: number
}

export interface CountByRole {
  role: UserRole
  count: number
}

export interface ActiveStateStats {
  active: number
  inactive: number
}

export interface AdminUserStats {
  total: number
  newUsersLast7Days: CountByDate[]
  newUsersLast30Days: CountByDate[]
  breakdownByRole: CountByRole[]
  activeVsInactive: ActiveStateStats
}

export interface AdminToolStats {
  toolType: string
  count: number
}

export interface AdminTickerStats {
  ticker: string
  count: number
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
  fiftyTwoWeekHigh?: number | null
  fiftyTwoWeekLow?: number | null
  sharesOutstanding?: number | null
  profitMargin?: number | null
  priceToSales?: number | null
  priceToBook?: number | null
  returnOnEquity?: number | null
  returnOnAssets?: number | null
  grossProfit?: number | null
  operatingMargin?: number | null
  netMargin?: number | null
  currentRatio?: number | null
  quickRatio?: number | null
  analystTargetPrice?: number | null
  employees?: number | null
  country?: string | null
  address?: string | null
  fiscalYearEnd?: string | null
  latestQuarter?: string | null
  forwardPE?: number | null
  pegRatio?: number | null
  beta?: number | null
}

export interface CompanyIncomeHistoryRow {
  year: string
  revenue: number | null
  netIncome: number | null
}

export interface CompanyEpsHistoryRow {
  year: string
  eps: number | null
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
  change?: number | null
  changePercent?: number | null
}

export interface CompanySnapshot {
  ticker: string
  company: Company | null
  fundamentals: CompanyFundamentals | null
  incomeHistory: CompanyIncomeHistoryRow[]
  epsHistory: CompanyEpsHistoryRow[]
  quote: StockQuote | null
  fetchedAt: {
    company: string | null
    fundamentals: string | null
    incomeHistory: string | null
    epsHistory: string | null
    quote: string | null
  }
  freshness: {
    company: 'fresh' | 'stale' | 'missing'
    fundamentals: 'fresh' | 'stale' | 'missing'
    incomeHistory: 'fresh' | 'stale' | 'missing'
    epsHistory: 'fresh' | 'stale' | 'missing'
    quote: 'fresh' | 'missing'
  }
  missing: string[]
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
