# Lucrum

Lucrum is an investment web platform for beginners. It combines educational
content with practical tools such as FIRE, DCA, fair price / DCF, investment
calculators, and stock analysis by ticker.

The product is designed for English-first usage with French localization.

## Stack

- React + TypeScript + Vite for the web app
- Cloudflare Workers + Hono for the API
- Cloudflare D1 for relational data
- Cloudflare KV for cache
- pnpm workspaces for monorepo management

## Repository Structure

```text
.
├── apps/
│   ├── web/              React frontend
│   └── worker/           Cloudflare Worker API
├── packages/
│   └── shared/           Shared package placeholder
├── AGENTS.md             Agent and project conventions
├── CODESTYLE (1).md      Code style guide
├── DECISIONS.md          Architecture decisions
├── architecture (2).md   System architecture notes
├── package.json
└── pnpm-workspace.yaml
```

## Getting Started

Install dependencies from the repository root:

```bash
pnpm install
```

Start the frontend:

```bash
pnpm --filter web dev
```

The web app runs on `http://localhost:5173` by default.

## Available Commands

Frontend:

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web preview
```

Worker package scripts are still being added. Until then, run Wrangler commands
from `apps/worker` or add explicit scripts before relying on them in CI.

## Environment

Frontend local environment file:

```bash
apps/web/.env
```

```env
VITE_API_BASE_URL=http://localhost:8787
```

Worker local environment file:

```bash
apps/worker/.dev.vars
```

```env
JWT_SECRET=
FMP_API_KEY=
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com
```

Do not commit `.env`, `.dev.vars`, local Wrangler state, package manager stores,
or `node_modules`.

## Development Rules

- Use `pnpm`, not `npm` or `yarn`.
- Keep TypeScript strict and avoid `any`.
- Use i18n keys for UI strings.
- Keep API calls in service modules, not React components.
- Use Tailwind classes instead of inline styles.
- Validate Worker request and response data with Zod when API routes are added.
- Follow the response shape `{ success: true, data }` or
  `{ success: false, error }`.

## Git Notes

Generated folders are ignored at the repository root, including:

- `node_modules/`
- `.pnpm-store/`
- `.wrangler/`
- `.claude/`
- `dist/`

Before committing, check:

```bash
git status
```
