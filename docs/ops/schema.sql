CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  ip TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_path ON events(path);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
