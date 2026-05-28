# InvestUA — Повна Архітектура Проекту

> Інвестиційна веб-платформа: калькулятори, аналіз акцій, едукація.
> Мови: English (основна), Français
> Інфраструктура: повністю Cloudflare (безкоштовно)

---

## 1. Концепція

**Що це:** Веб-додаток для початківців інвесторів. Безкоштовні інструменти (калькулятори, аналіз акцій, FAQ) + PRO-функції за підпискою.

**Цільова аудиторія:** Англомовна + франкомовна аудиторія

**Платформа:** Web (mobile-responsive + PWA)

---

## 2. Стек технологій

### Frontend
```
React 18 + TypeScript
Vite                    — білд тул
TailwindCSS             — стилі
Recharts                — графіки
React Router v6         — навігація
Zustand                 — стейт менеджмент
Axios                   — HTTP запити
react-i18next           — мультимовність (EN / FR)
```

### Backend
```
Cloudflare Workers      — serverless бекенд (TypeScript)
Hono                    — мінімалістичний веб-фреймворк для Workers
Jose / hono/jwt         — JWT авторизація
```

### База даних і кеш
```
Cloudflare D1           — основна БД (SQLite на edge)
Cloudflare KV           — кешування (замість Redis)
```

### Інфраструктура
```
Cloudflare Pages        — хостинг фронту (безкоштовно)
Cloudflare Workers      — хостинг бекенду (безкоштовно, 100k req/день)
Cloudflare D1           — БД (безкоштовно, 5GB)
Cloudflare KV           — кеш (безкоштовно, 100k читань/день)
Cloudflare R2           — файлове сховище (якщо знадобиться, 10GB безкоштовно)
```

> 💡 Вся інфраструктура безкоштовна на старті. При зростанні — платний Workers тир $5/міс дає 10M req/міс.

---

## 3. Модулі та маршрути

```
/                        — Лендінг (публічний)
/learn                   — FAQ / Едукація (публічний)
  /learn/stocks          — Що таке акції
  /learn/bonds           — Що таке облігації
  /learn/dcf             — Що таке DCF
  /learn/cashflow        — Що таке Cash Flow
  /learn/etf             — Що таке ETF

/tools                   — Список інструментів (публічний)
  /tools/invest-calc     — Інвест калькулятор (FREE)
  /tools/fire            — FIRE калькулятор (FREE)
  /tools/dca             — DCA Симулятор (FREE)
  /tools/fair-price      — Fair Price / DCF (FREE)
  /tools/stock           — Аналіз акції по тікеру (FREE)

/dashboard               — Особистий кабінет (авторизований)
/pricing                 — Підписка

/auth/login              — Логін
/auth/register           — Реєстрація

/admin                   — Адмін панель (тільки ADMIN)
```

---

## 4. Мультимовність (i18n)

**Бібліотека:** `react-i18next`

### Структура файлів
```
src/locales/
├── en/
│   ├── common.json      — навігація, кнопки, загальні елементи
│   ├── tools.json       — калькулятори
│   └── learn.json       — едукаційний контент
└── fr/
    ├── common.json
    ├── tools.json
    └── learn.json
```

### Логіка
- Юзер вибирає мову через перемикач у хедері
- Вибір зберігається в `localStorage`
- URL не змінюється (`/tools/fire` для обох мов)
- Мова визначається автоматично з браузера при першому візиті

---

## 5. Ролі користувачів

| Роль | Опис | Відображається юзеру? |
|---|---|---|
| `USER` | Звичайний юзер, базовий доступ | ❌ |
| `USER_PRO` | Платна підписка, розширений доступ | ❌ |
| `MODERATOR` | Може модерувати контент | ❌ |
| `ADMIN` | Повний доступ + адмін панель | ❌ |

> Роль не показується юзеру — він просто бачить відповідний функціонал.

---

## 6. База даних (Cloudflare D1 / SQLite)

### `users`
```sql
id              TEXT PRIMARY KEY          -- UUID
email           TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
first_name      TEXT
last_name       TEXT
role            TEXT DEFAULT 'USER'       -- USER | USER_PRO | MODERATOR | ADMIN
is_active       INTEGER DEFAULT 1         -- 1 = active, 0 = banned
created_at      TEXT                      -- ISO 8601
updated_at      TEXT
```

### `companies`
```sql
id              TEXT PRIMARY KEY          -- UUID
ticker          TEXT UNIQUE NOT NULL      -- "AAPL"
name            TEXT NOT NULL             -- "Apple Inc."
exchange        TEXT                      -- "NASDAQ"
sector          TEXT                      -- "Technology"
industry        TEXT                      -- "Consumer Electronics"
description     TEXT
last_synced_at  TEXT                      -- коли останній раз оновлювали з API
created_at      TEXT
```

### `company_fundamentals`
```sql
id              TEXT PRIMARY KEY
company_id      TEXT REFERENCES companies(id)
eps_ttm         REAL
revenue         INTEGER
net_income      INTEGER
free_cash_flow  INTEGER
pe_ratio        REAL
market_cap      INTEGER
dividend_yield  REAL
debt_to_equity  REAL
recorded_date   TEXT                      -- "2024-12-31"
created_at      TEXT
```

### `saved_calculations`
```sql
id              TEXT PRIMARY KEY
user_id         TEXT REFERENCES users(id)
tool_type       TEXT                      -- INVEST_CALC | FIRE | DCA | FAIR_PRICE | STOCK
input_params    TEXT                      -- JSON string
result_snapshot TEXT                      -- JSON string
created_at      TEXT
```

### `watchlist`
```sql
id              TEXT PRIMARY KEY
user_id         TEXT REFERENCES users(id)
ticker          TEXT NOT NULL
company_name    TEXT
added_at        TEXT
```

### `tool_usage_events`
```sql
id              TEXT PRIMARY KEY
user_id         TEXT                      -- nullable (анонімні юзери теж)
tool_type       TEXT
ticker          TEXT                      -- nullable
created_at      TEXT
```

### `page_views`
```sql
id              TEXT PRIMARY KEY
user_id         TEXT                      -- nullable
page_path       TEXT
created_at      TEXT
```

---

## 7. Кешування (Cloudflare KV)

```
Юзер шукає тікер "AAPL"
        ↓
KV: є ключ "company:AAPL"? (TTL: 1 година)
  ТАК → повертаємо з KV (мілісекунди)
        ↓
  НІ → D1: є запис і last_synced_at < 24 год?
    ТАК → повертаємо з D1 + пишемо в KV
        ↓
    НІ → FMP API → зберігаємо в D1 → KV → юзер
```

**Scheduled Worker (щоночі):**
Автоматично оновлює топ-100 найпопулярніших тікерів з `tool_usage_events`.
~100 запитів/добу — вкладається в безкоштовний FMP тир.

---

## 8. Зовнішні API — Фінансові дані

### Основний: Financial Modeling Prep (FMP)
- Безкоштовно: 250 req/день
- Дає: EPS, revenue, FCF, P/E, market cap, опис, sector, exchange
- Використовується для: Fair Price / DCF, аналіз акцій

### Додатковий: Yahoo Finance (неофіційний)
- Необмежено (без гарантій стабільності)
- Використовується для: DCA симулятор (історичні котирування)

> ⚠️ При зростанні аудиторії — платний тир FMP (~$14/міс → 300 req/хв)

---

## 9. Авторизація (JWT у Cloudflare Workers)

```
POST /api/auth/register   — реєстрація
POST /api/auth/login      — логін → access token (15хв) + refresh token (7 днів)
POST /api/auth/refresh    — оновити access token
POST /api/auth/logout     — інвалідувати refresh token

Токени зберігаються в httpOnly cookie
JWT підписується через Jose бібліотеку в Workers
```

---

## 10. REST API ендпоінти

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Companies
```
GET    /api/companies/search?q=apple
GET    /api/companies/:ticker
GET    /api/companies/:ticker/fundamentals
```

### Tools
```
GET    /api/tools/dca?ticker=AAPL&from=2020-01&amount=500
GET    /api/tools/stock-history?ticker=AAPL&period=5y
```

### Dashboard
```
GET    /api/calculations
POST   /api/calculations
DELETE /api/calculations/:id
GET    /api/watchlist
POST   /api/watchlist
DELETE /api/watchlist/:ticker
```

### Admin
```
GET    /api/admin/stats/users
GET    /api/admin/stats/tools
GET    /api/admin/stats/tickers
GET    /api/admin/users
PATCH  /api/admin/users/:id/role
PATCH  /api/admin/users/:id/active
```

---

## 11. Структура папок

### Frontend
```
src/
├── components/
│   ├── ui/              — Button, Input, Card, Badge, Modal...
│   └── charts/          — LineChart, AreaChart обгортки
├── pages/
│   ├── Landing.tsx
│   ├── Learn.tsx
│   ├── Tools.tsx
│   ├── Dashboard.tsx
│   ├── Admin.tsx
│   └── auth/
├── features/
│   ├── invest-calc/
│   ├── fire/
│   ├── dca/
│   ├── fair-price/
│   └── stock/
├── locales/
│   ├── en/
│   └── fr/
├── services/            — API виклики (axios)
├── store/               — Zustand стори
├── hooks/               — кастомні хуки
└── utils/               — формули, форматування
```

### Backend (Cloudflare Workers)
```
worker/
├── src/
│   ├── index.ts         — точка входу, роутер Hono
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── companies.ts
│   │   ├── tools.ts
│   │   ├── dashboard.ts
│   │   └── admin.ts
│   ├── middleware/
│   │   ├── auth.ts      — JWT перевірка
│   │   └── role.ts      — перевірка ролі
│   ├── services/
│   │   ├── fmp.ts       — FMP API клієнт
│   │   ├── yahoo.ts     — Yahoo Finance клієнт
│   │   └── cache.ts     — KV операції
│   └── db/
│       ├── schema.sql   — D1 схема
│       └── queries.ts   — SQL запити
└── wrangler.toml        — Cloudflare конфіг
```

---

## 12. Адмін панель — Статистика

**Юзери:**
- Загальна кількість
- Нові за день / тиждень / місяць (графік)
- Розбивка по ролях
- Активні vs заблоковані

**Інструменти:**
- Кількість запусків кожного калькулятора
- Найпопулярніші тікери (топ-20)
- Активність по днях / годинах

**Трафік:**
- Найбільш відвідувані сторінки

---

## 13. Дизайн-система

```
Тема:            Dark — преміальний, мінімалістичний

Кольори:
  Background:    #0A0A0A   — основний фон
  Surface:       #111111   — картки, панелі
  Surface alt:   #0E0E0E   — tool картки
  Border:        #1E1E1E   — тонкі бордери (0.5px)
  Border hover:  #2A2A2A

  Primary:       #C9A84C   — золотий акцент (CTA, іконки, логотип)
  Primary dim:   #C9A84C11 — золотий фон (badges, hover fills)

  Success:       #4CAF50   — прибуток, undervalued
  Danger:        #EF4444   — збиток, overvalued
  Text primary:  #FFFFFF
  Text muted:    #666666
  Text subtle:   #555555

Типографіка:
  Заголовки:     Serif (Playfair Display або Cormorant Garamond)
                 font-weight: 400 (не bold — елегантніше)
  Тіло:          Inter або system sans-serif
  Logo/Brand:    Serif, letter-spacing: 2px, uppercase

Компоненти:
  Border radius: 6px (кнопки, інпути), 10-12px (картки)
  Border width:  0.5px — скрізь тонкий
  Кнопка CTA:    bg #C9A84C, color #0A0A0A, font-weight 500
  Кнопка ghost:  transparent, border 0.5px #2A2A2A, color #fff
  Badge Free:    color #C9A84C, bg #C9A84C11
  Nav links:     color #888, hover #fff
```

---

## 14. Фази розробки

### Фаза 1 — Frontend MVP
- Лендінг + UI компоненти
- Всі калькулятори (чиста математика, без API)
- i18n (EN / FR)
- Deploy на Cloudflare Pages
- **Результат:** живий сайт

### Фаза 2 — Backend (Cloudflare Workers)
- Hono роутер, D1 схема
- JWT авторизація (реєстрація / логін)
- Проксі для FMP API + KV кешування

### Фаза 3 — З'єднання фронт + бек
- DCA симулятор з реальними котируваннями
- Аналіз акцій по тікеру
- Авторизація на фронті

### Фаза 4 — Dashboard + Admin
- Збережені розрахунки
- Watchlist
- Адмін панель зі статистикою

### Фаза 5 — Монетизація
- Підписка (Stripe / LiqPay)
- PRO функції

---

*Останнє оновлення: травень 2026*
