# Lucrum — AI Agent Instructions

> This file is read automatically by Codex, Claude Code, and other AI agents.
> Follow these instructions precisely before writing any code.

---

## Project Overview

**Lucrum** is an investment web platform for beginners.
Features: financial calculators (FIRE, DCA, Fair Price/DCF, Invest), stock analysis by ticker, educational content.

**Languages:** English (primary), Français
**Stack:** React + TypeScript + Vite (frontend) · Cloudflare Workers + Hono (backend) · Cloudflare D1 (database) · Cloudflare KV (cache)
**Full architecture:** see `docs/architecture.md`

---

## Monorepo Structure

```
lucrum/
├── apps/
│   ├── web/               — React frontend (Cloudflare Pages)
│   └── worker/            — Cloudflare Workers backend (Hono)
├── packages/
│   └── shared/            — shared types, constants, utils
├── docs/
│   ├── architecture.md
│   ├── CODESTYLE.md
│   └── DECISIONS.md
├── AGENTS.md              — this file
└── package.json           — root (pnpm workspaces)
```

---

## Package Manager

**Always use `pnpm`.** Never use `npm` or `yarn`.

```bash
pnpm install              # install all dependencies
pnpm --filter web dev     # run frontend dev server
pnpm --filter worker dev  # run worker locally (wrangler dev)
pnpm --filter web build   # build frontend
```

---

## Dev Commands

```bash
# Frontend (apps/web)
pnpm --filter web dev          # localhost:5173
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web typecheck

# Backend (apps/worker)
pnpm --filter worker dev       # wrangler dev, localhost:8787
pnpm --filter worker deploy    # deploy to Cloudflare

# D1 Database
pnpm --filter worker db:migrate        # run migrations
pnpm --filter worker db:migrate:local  # local D1
```

---

## Before Writing Any Code

1. Read `docs/architecture.md` — understand the full system
2. Read `docs/CODESTYLE.md` — follow the conventions
3. Check `packages/shared/types/` — use existing types, don't redefine
4. Check if a component/hook/util already exists before creating a new one

---

## Key Conventions

### Never do this
- ❌ `npm install` or `yarn` — use `pnpm`
- ❌ `any` type in TypeScript
- ❌ inline styles — use Tailwind classes only
- ❌ `console.log` in production code — use the logger util
- ❌ hardcoded strings in UI — use i18n keys (`t('key')`)
- ❌ direct API calls from components — use service layer in `services/`
- ❌ business logic in components — keep components presentational
- ❌ `localStorage` for auth tokens — use httpOnly cookies
- ❌ expose API keys on frontend — all external API calls go through Worker

### Always do this
- ✅ TypeScript strict mode — no implicit `any`
- ✅ i18n for all UI text — `t('namespace.key')`
- ✅ Error boundaries on route level
- ✅ Loading and error states for every async operation
- ✅ Zod for request/response validation in Worker
- ✅ KV cache check before D1 query before external API call

---

## Environment Variables

### Frontend (`apps/web/.env`)
```
VITE_API_BASE_URL=http://localhost:8787
```

### Worker (`apps/worker/.dev.vars`)
```
JWT_SECRET=
FMP_API_KEY=
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com
```

> Never commit `.env` or `.dev.vars` files.

---

## Database (Cloudflare D1)

- Migrations live in `apps/worker/db/migrations/`
- Schema reference in `apps/worker/db/schema.sql`
- Always use parameterized queries — never string interpolation in SQL
- UUID generation: `crypto.randomUUID()`

---

## API Design Rules

- All routes prefixed with `/api/`
- Auth routes: `/api/auth/*`
- Protected routes require `authMiddleware`
- Admin routes require `authMiddleware` + `roleMiddleware('ADMIN')`
- Always return consistent response shape:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

---

## Caching Strategy (KV)

```
KV key format:   "company:{ticker}"       TTL: 1 hour
                 "fundamentals:{ticker}"   TTL: 6 hours
                 "history:{ticker}:{from}" TTL: 24 hours

Always check KV → D1 → External API (in this order)
After fetching from API, write to D1 then KV
```

---

## Git Conventions

```
feat:     new feature
fix:      bug fix
chore:    tooling, deps, config
refactor: code change without feature/fix
docs:     documentation only
style:    formatting, no logic change
```

Branch naming: `feat/fire-calculator`, `fix/auth-refresh-token`

---

## When in Doubt

- Check `docs/architecture.md` for system-level decisions
- Check `docs/DECISIONS.md` for why specific choices were made
- Keep PRs small and focused — one feature per PR
