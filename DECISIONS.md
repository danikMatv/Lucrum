# Lucrum — Architecture Decision Records (ADR)

> Why we made specific technical choices.
> Update this file when making significant architectural decisions.

---

## ADR-001: Full Cloudflare Stack

**Date:** May 2026
**Status:** Accepted

### Decision
Use Cloudflare Pages (frontend) + Cloudflare Workers (backend) + Cloudflare D1 (database) + Cloudflare KV (cache) instead of a traditional VPS or Railway setup.

### Reasoning
- Zero hosting cost on free tier
- Workers + Pages free tier covers early-stage traffic comfortably
- No cold start issues compared to free-tier Railway/Render
- Built-in CDN, DDoS protection, SSL
- KV replaces Redis with zero additional cost

### Trade-offs
- D1 is SQLite — less powerful than PostgreSQL for complex aggregations
- Workers don't support Java/Spring Boot — requires TypeScript backend
- D1 has write limitations (25 writes/sec on free tier)

### Migration path
If D1 becomes a bottleneck → migrate to Neon (serverless PostgreSQL) with minimal Worker changes.

---

## ADR-002: Hono over Express/Elysia for Workers

**Date:** May 2026
**Status:** Accepted

### Decision
Use **Hono** as the web framework for Cloudflare Workers backend.

### Reasoning
- Built specifically for edge runtimes (Workers, Deno, Bun)
- Extremely lightweight (<15KB)
- First-class TypeScript support
- Built-in middleware: JWT, CORS, Zod validator, rate limiting
- Similar API to Express — easy to reason about

### Alternatives considered
- **Elysia** — Bun-first, less mature on Workers
- **itty-router** — too minimal, no middleware ecosystem
- **Express** — not designed for edge, larger bundle

---

## ADR-003: React + Vite over Next.js

**Date:** May 2026
**Status:** Accepted

### Decision
Use **Vite + React** (SPA) instead of Next.js.

### Reasoning
- Cloudflare Pages works perfectly with SPAs
- No need for SSR — all data is user-specific (calculators, portfolio)
- Simpler mental model — no server/client component split
- Faster development iteration
- SEO not critical for tool-heavy app (calculators don't need indexing)

### Trade-offs
- Landing page and /learn pages won't be SEO-optimized
- If SEO becomes important → can migrate landing to Astro static pages

---

## ADR-004: pnpm Workspaces (Monorepo)

**Date:** May 2026
**Status:** Accepted

### Decision
Single monorepo with pnpm workspaces: `apps/web`, `apps/worker`, `packages/shared`.

### Reasoning
- Shared TypeScript types between frontend and backend (no duplication)
- Single `git` repo — easier to manage
- `packages/shared` for API response types, constants, utility functions
- Consistent tooling across the project

---

## ADR-005: Zustand over Redux

**Date:** May 2026
**Status:** Accepted

### Decision
Use **Zustand** for client-side state management.

### Reasoning
- Minimal boilerplate compared to Redux
- No Provider wrapping needed
- Built-in TypeScript support
- Sufficient for our use case (auth state, calculator state, watchlist)
- Easy to learn

---

## ADR-006: Financial Modeling Prep as Primary Data Source

**Date:** May 2026
**Status:** Accepted

### Decision
Use **Financial Modeling Prep (FMP)** as primary API for company fundamentals.

### Reasoning
- Clean, well-documented API
- Provides all needed data: EPS, FCF, P/E, market cap, sector, description
- Free tier: 250 req/day — sufficient with aggressive KV caching
- Affordable paid tier: ~$14/month for 300 req/min when needed

### Secondary source
**Yahoo Finance** (unofficial) for historical price data (DCA simulator) — unlimited but unofficial.

### Risk mitigation
KV cache + D1 persistence means FMP is rarely hit directly.
Scheduled Worker refreshes top-100 tickers nightly (~100 req/day).

---

## ADR-007: EN + FR + UK Languages

**Date:** May 2026
**Status:** Accepted

### Decision
Launch with **English** (primary), **Français**, and **Українська**.

### Reasoning
- Broader international audience
- EN is universal for finance content
- FR opens Western European market
- UK supports Ukrainian-speaking users and the product team's home context

### i18n implementation
`react-i18next` with namespace-based translation files.
Language persisted in `localStorage`, auto-detected from browser on first visit.

---

## ADR-008: Roles Not Visible to Users

**Date:** May 2026
**Status:** Accepted

### Decision
User roles (USER, USER_PRO, MODERATOR, ADMIN) are **never displayed** to users.

### Reasoning
- Users care about what they can do, not their role label
- Cleaner UX — show feature access, not internal classification
- Easier to change role system without affecting UI

### Implementation
Frontend checks permissions/features, not role strings directly.
`usePermissions()` hook abstracts role checks.

---

## ADR-009: Aggressive Caching Strategy

**Date:** May 2026
**Status:** Accepted

### Decision
Three-layer cache: KV (hot) → D1 (warm) → External API (cold).

### TTLs
| Data type | KV TTL | D1 refresh |
|---|---|---|
| Company info | 1 hour | 24 hours |
| Fundamentals | 6 hours | 24 hours |
| Price history | 24 hours | 7 days |

### Reasoning
- Free FMP tier (250 req/day) not sufficient for real traffic without caching
- Fundamental data changes quarterly — daily refresh is more than enough
- KV reads are free and instant — aggressive TTLs are fine

---

## ADR-010: Alpha Vantage as Primary Fundamentals Source

**Date:** May 2026
**Status:** Accepted

### Decision
Use **Alpha Vantage** as the primary source for company fundamentals and 5-year income statements.

### Reasoning
- FMP free tier can return incomplete fundamentals and limited income statement data
- Alpha Vantage provides complete overview metrics and annual income statements on the free tier
- The 25 requests/day limit is mitigated by 90-day D1 snapshot caching

### Fallbacks
FMP remains as the fallback and supplementary provider for fields Alpha Vantage does not include, such as free cash flow and debt/equity.

### Quotes
Live quotes remain separate from 90-day fundamentals caching and continue to use short-lived KV caching with the existing quote providers.
