CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'USER',
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  description TEXT,
  last_synced_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS company_fundamentals (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  eps_ttm REAL,
  revenue INTEGER,
  net_income INTEGER,
  free_cash_flow INTEGER,
  pe_ratio REAL,
  market_cap INTEGER,
  dividend_yield REAL,
  debt_to_equity REAL,
  recorded_date TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS company_snapshots (
  ticker TEXT PRIMARY KEY,
  company_json TEXT,
  fundamentals_json TEXT,
  income_history_json TEXT,
  eps_history_json TEXT,
  company_fetched_at TEXT,
  fundamentals_fetched_at TEXT,
  income_fetched_at TEXT,
  eps_history_fetched_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS saved_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  tool_type TEXT,
  input_params TEXT,
  result_snapshot TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  ticker TEXT NOT NULL,
  company_name TEXT,
  added_at TEXT
);

CREATE TABLE IF NOT EXISTS learn_resources (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'article',
  description TEXT,
  added_by TEXT REFERENCES users(id),
  added_by_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tool_usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  tool_type TEXT,
  ticker TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  page_path TEXT,
  created_at TEXT
);
