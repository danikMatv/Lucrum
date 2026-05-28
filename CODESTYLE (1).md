# Lucrum — Code Style Guide

> Conventions for React/TypeScript frontend and Cloudflare Workers backend.

---

## TypeScript

### Strict mode — always on
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Types vs Interfaces
- `interface` — for objects that can be extended (API responses, props)
- `type` — for unions, intersections, primitives, utility types

```typescript
// ✅ Good
interface CompanyFundamentals {
  ticker: string
  epsTTM: number
  peRatio: number | null
}

type ToolType = 'INVEST_CALC' | 'FIRE' | 'DCA' | 'FAIR_PRICE' | 'STOCK'
type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError }
```

### Never use `any`
```typescript
// ❌ Bad
const handleData = (data: any) => { ... }

// ✅ Good
const handleData = (data: CompanyFundamentals) => { ... }
// or if truly unknown:
const handleData = (data: unknown) => { ... }
```

### Enums → const objects
```typescript
// ❌ Avoid TypeScript enums
enum Role { USER, ADMIN }

// ✅ Use const objects
const Role = {
  USER: 'USER',
  USER_PRO: 'USER_PRO',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const
type Role = typeof Role[keyof typeof Role]
```

---

## React Components

### Functional components only — no class components

```typescript
// ✅ Good
interface Props {
  ticker: string
  onSelect: (ticker: string) => void
}

export const TickerSearch = ({ ticker, onSelect }: Props) => {
  return <div>...</div>
}
```

### One component per file
File name = component name in PascalCase:
```
TickerSearch.tsx
FireCalculator.tsx
StatsCard.tsx
```

### Component structure order
```typescript
export const MyComponent = ({ prop1, prop2 }: Props) => {
  // 1. hooks (useState, useEffect, custom hooks)
  // 2. derived state / computed values
  // 3. handlers (handleClick, handleSubmit...)
  // 4. early returns (loading, error states)
  // 5. main render
  return (...)
}
```

### Props destructuring — always in signature
```typescript
// ❌ Bad
export const Card = (props: Props) => {
  return <div>{props.title}</div>
}

// ✅ Good
export const Card = ({ title, subtitle, children }: Props) => {
  return <div>{title}</div>
}
```

---

## Styling (Tailwind)

### No inline styles
```typescript
// ❌ Bad
<div style={{ color: 'red', marginTop: 8 }}>

// ✅ Good
<div className="text-danger mt-2">
```

### Class organization order
```
1. Layout:      flex, grid, block, hidden
2. Sizing:      w-, h-, min-, max-
3. Spacing:     p-, m-, gap-
4. Typography:  text-, font-, leading-
5. Colors:      bg-, text-, border-
6. Effects:     shadow-, opacity-, blur-
7. Interactive: hover:, focus:, active:
8. Responsive:  sm:, md:, lg:
```

### Design tokens (use these, don't hardcode colors)
```
background      → #0A0A0A   main background
surface         → #111111   cards, panels
surface-alt     → #0E0E0E   tool cards
border          → #1E1E1E   default border (always 0.5px)
border-hover    → #2A2A2A

primary         → #C9A84C   gold accent — CTA, icons, logo
primary-dim     → #C9A84C11 gold tint — badges, hover fills

success         → #4CAF50   profit, undervalued
danger          → #EF4444   loss, overvalued
text-primary    → #FFFFFF
text-muted      → #666666
text-subtle     → #555555

font-heading    → Playfair Display (serif)
font-body       → Inter (sans-serif)
```

---

## i18n (Internationalization)

### Never hardcode UI strings
```typescript
// ❌ Bad
<h1>Investment Calculator</h1>
<p>Calculate your future portfolio value</p>

// ✅ Good
const { t } = useTranslation('tools')
<h1>{t('investCalc.title')}</h1>
<p>{t('investCalc.description')}</p>
```

### Key naming convention
```
namespace.section.element

tools.investCalc.title
tools.investCalc.description
tools.fire.ruleExplanation
common.nav.tools
common.buttons.calculate
common.errors.networkError
```

### Both languages must be updated simultaneously
When adding a new key to `en/`, immediately add it to `fr/` too.

---

## State Management (Zustand)

### Store structure
```typescript
// stores/useAuthStore.ts
interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  login: async (email, password) => { ... },
  logout: async () => { ... },
}))
```

### One store per domain
```
useAuthStore.ts       — auth, user
useCalculatorStore.ts — calculator state
useWatchlistStore.ts  — watchlist
```

---

## API Layer (services/)

### Never call API directly from components
```typescript
// ❌ Bad — API call in component
const MyComponent = () => {
  const fetchData = async () => {
    const res = await axios.get('/api/companies/AAPL')
  }
}

// ✅ Good — use service
// services/companiesService.ts
export const companiesService = {
  getByTicker: (ticker: string) =>
    apiClient.get<Company>(`/companies/${ticker}`),

  search: (query: string) =>
    apiClient.get<Company[]>('/companies/search', { params: { q: query } }),
}

// In component:
const { data } = useQuery(['company', ticker], () =>
  companiesService.getByTicker(ticker)
)
```

---

## Cloudflare Worker (Hono)

### Route handler structure
```typescript
// routes/companies.ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const companies = new Hono()

const searchSchema = z.object({
  q: z.string().min(1).max(50),
})

companies.get('/search', zValidator('query', searchSchema), async (c) => {
  const { q } = c.req.valid('query')

  try {
    // 1. KV cache check
    // 2. D1 query
    // 3. External API fallback
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: { code: 'SEARCH_FAILED', message: 'Search failed' } }, 500)
  }
})

export default companies
```

### Always validate with Zod
```typescript
// ❌ Bad — no validation
app.post('/api/auth/register', async (c) => {
  const { email, password } = await c.req.json()
  // ...
})

// ✅ Good
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
})

app.post('/api/auth/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json')
  // body is fully typed and validated
})
```

### SQL — parameterized queries only
```typescript
// ❌ Bad — SQL injection risk
const result = await db.prepare(
  `SELECT * FROM companies WHERE ticker = '${ticker}'`
).all()

// ✅ Good
const result = await db.prepare(
  'SELECT * FROM companies WHERE ticker = ?'
).bind(ticker).all()
```

---

## Error Handling

### Frontend — always handle loading + error states
```typescript
const { data, isLoading, isError } = useQuery(...)

if (isLoading) return <Spinner />
if (isError) return <ErrorMessage />
return <DataView data={data} />
```

### Worker — consistent error response
```typescript
// utils/errors.ts
export const createError = (code: string, message: string, status = 400) => ({
  success: false as const,
  error: { code, message },
})

// Usage
return c.json(createError('NOT_FOUND', 'Company not found'), 404)
```

---

## File Naming

```
Components:     PascalCase    — FireCalculator.tsx, StatsCard.tsx
Hooks:          camelCase     — useFireCalculator.ts, useCompanySearch.ts
Services:       camelCase     — companiesService.ts, authService.ts
Stores:         camelCase     — useAuthStore.ts
Utils:          camelCase     — formatCurrency.ts, calculateFire.ts
Types:          camelCase     — company.types.ts
Constants:      camelCase     — routes.constants.ts
Worker routes:  camelCase     — companies.ts, auth.ts
```

---

## Imports Order

```typescript
// 1. External libraries
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'recharts'

// 2. Internal — absolute paths
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/useAuthStore'

// 3. Internal — relative paths
import { calculateFire } from './utils/calculateFire'
import type { FireInputs } from './types'
```

---

## Comments

```typescript
// ✅ Comment WHY, not WHAT
// Multiply by 12 to convert monthly expenses to annual (required by 4% rule)
const fireNumber = monthlyExpenses * 12 * (100 / withdrawalRate)

// ❌ Don't comment the obvious
// Set i to 0
let i = 0
```

### JSDoc for exported functions/hooks
```typescript
/**
 * Calculates FIRE number and years to financial independence.
 * Based on the Trinity Study (4% rule).
 *
 * @param monthlyExpenses - Current monthly expenses in USD
 * @param currentPortfolio - Current portfolio value in USD
 * @param monthlyContribution - Monthly investment contribution in USD
 * @param annualReturn - Expected annual return (real, after inflation) as decimal
 * @param withdrawalRate - Safe withdrawal rate as percentage (default: 4)
 */
export const calculateFire = (
  monthlyExpenses: number,
  currentPortfolio: number,
  monthlyContribution: number,
  annualReturn: number,
  withdrawalRate = 4,
): FireResult => { ... }
```
