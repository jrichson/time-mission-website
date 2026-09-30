-- Only aggregate technical diagnostics; no customer identifiers or full URLs.
CREATE TABLE IF NOT EXISTS csp_monitor_reports (
  day TEXT NOT NULL,
  page_group TEXT NOT NULL,
  directive TEXT NOT NULL,
  blocked_origin TEXT NOT NULL,
  provider TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (day, page_group, directive, blocked_origin, provider)
);
CREATE TABLE IF NOT EXISTS provider_monitor_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fingerprint TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
