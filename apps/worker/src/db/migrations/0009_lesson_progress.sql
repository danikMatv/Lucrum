CREATE TABLE lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  quiz_score INTEGER,
  quiz_total INTEGER,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, topic, lesson_id)
);

CREATE TABLE user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  UNIQUE(user_id, badge_id)
);
