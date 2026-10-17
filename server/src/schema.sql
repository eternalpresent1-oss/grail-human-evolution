CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('apple', 'google')),
  provider_subject text NOT NULL,
  email text,
  free_life_vector_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_snapshots (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision >= 1),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  store text NOT NULL CHECK (store IN ('apple', 'google')),
  product_id text NOT NULL,
  status text NOT NULL,
  period_end timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day date NOT NULL,
  questions integer NOT NULL DEFAULT 0 CHECK (questions >= 0),
  vector_refreshes integer NOT NULL DEFAULT 0 CHECK (vector_refreshes >= 0),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS deletions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  requested_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL
);
