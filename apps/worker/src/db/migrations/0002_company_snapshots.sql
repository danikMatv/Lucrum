CREATE TABLE IF NOT EXISTS company_snapshots (
  ticker TEXT PRIMARY KEY,
  company_json TEXT,
  fundamentals_json TEXT,
  company_fetched_at TEXT,
  fundamentals_fetched_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
