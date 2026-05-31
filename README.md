# Lucrum

> Investment web platform for beginners. Free calculators, stock analysis, and educational content.

## Live

- Frontend: https://lucrum.pages.dev
- API: https://lucrum-worker.danior202.workers.dev

## Tech Stack

- Frontend: React 19 + TypeScript + Vite + TailwindCSS + Recharts
- Backend: Cloudflare Workers + Hono + TypeScript
- Database: Cloudflare D1 (SQLite)
- Cache: Cloudflare KV
- Auth: JWT (httpOnly cookies)
- i18n: EN / FR / UK
- Hosting: Cloudflare Pages + Workers (free tier)

## Project Structure

```text
Lucrum/
+-- apps/
|   +-- web/                 - React frontend
|   +-- worker/              - Cloudflare Workers backend
+-- packages/
|   +-- shared/              - shared types and utilities
+-- architecture (2).md      - system architecture notes
+-- CODESTYLE (1).md         - code style guide
+-- DECISIONS.md             - architecture decisions
+-- AGENTS.md                - AI agent and project conventions
+-- package.json             - root package metadata
+-- pnpm-workspace.yaml      - pnpm workspace config
```

## Prerequisites

- Node.js 18+
- pnpm 11+
- Cloudflare account (free)
- Financial Modeling Prep API key (free tier, 250 req/day)

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/danikMatv/Lucrum
cd Lucrum
pnpm install
```

### 2. Set up environment variables

```bash
cp apps/web/.env.example apps/web/.env
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
# Fill in your values
```

### 3. Run database migrations (local)

```bash
cd apps/worker
pnpm db:migrate:local
```

### 4. Start dev servers

Terminal 1 - backend:

```bash
cd apps/worker
pnpm dev
```

Terminal 2 - frontend:

```bash
cd apps/web
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8787

## Build

```bash
pnpm --filter web build
pnpm --filter worker build
```

## Deployment

### Backend (Cloudflare Workers)

```bash
cd apps/worker
pnpm wrangler deploy
```

### Frontend (Cloudflare Pages)

Automatic on push to `main` via GitHub integration.

Configure in Cloudflare Pages:

```text
Build command: pnpm --filter web build
Output dir: apps/web/dist
Env var: VITE_API_BASE_URL = https://lucrum-worker.danior202.workers.dev
```

### Database migrations (production)

```bash
cd apps/worker
pnpm db:migrate
```

## User Roles

```text
USER       - default, basic access
USER_PRO   - paid subscription (future)
MODERATOR  - can add/edit learn resources
ADMIN      - full access + admin panel
```

To set a role manually:

```bash
pnpm wrangler d1 execute DB --remote --command "UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com'"
```

## Features

- 5 financial calculators: Invest, FIRE, DCA, Fair Price/DCF, Stock Analysis
- Investment academy (`/learn`): Bonds, Stocks, ETFs, Crypto, Venture, Risk basics
- Useful links per topic (managed by moderators)
- JWT auth with httpOnly cookies
- 90-day D1 cache for company fundamentals
- EN / FR / UK localization
- Admin panel with usage stats

## Contributing

Follow `CODESTYLE (1).md` and `AGENTS.md` conventions.

Use `pnpm`. Do not use `npm` or `yarn`.
