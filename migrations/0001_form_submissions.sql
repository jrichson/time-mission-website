CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  form_type TEXT NOT NULL CHECK (form_type IN ('contact', 'newsletter')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT,
  email TEXT NOT NULL,
  location TEXT,
  subject TEXT,
  message TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent TEXT,
  source_url TEXT,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at
  ON form_submissions (created_at);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_type_created_at
  ON form_submissions (form_type, created_at);

CREATE INDEX IF NOT EXISTS idx_form_submissions_location_created_at
  ON form_submissions (location, created_at);
