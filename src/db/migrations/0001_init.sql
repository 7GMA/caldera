-- Caldera initial schema migration
-- Run: psql $DATABASE_URL -f src/db/migrations/0001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Applications (tenants)
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  rate_limit_tier TEXT NOT NULL DEFAULT 'standard',
  webhook_secret TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_application_idx ON api_keys(application_id);

-- End Users
CREATE TABLE IF NOT EXISTS end_users (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS end_users_app_external_idx ON end_users(application_id, external_id);

-- Calendar Accounts
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id TEXT PRIMARY KEY,
  end_user_id TEXT NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  email TEXT,
  display_name TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  access_token_exp TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  caldav_server_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  refresh_fail_count INTEGER NOT NULL DEFAULT 0,
  last_refresh_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_accounts_provider_account_idx ON calendar_accounts(end_user_id, provider, provider_account_id);
CREATE INDEX IF NOT EXISTS calendar_accounts_status_exp_idx ON calendar_accounts(status, access_token_exp);
CREATE INDEX IF NOT EXISTS calendar_accounts_provider_idx ON calendar_accounts(provider);

-- Calendars cache
CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  calendar_account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  provider_calendar_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  read_only BOOLEAN NOT NULL DEFAULT FALSE,
  timezone TEXT,
  raw JSONB,
  etag TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS calendars_account_provider_idx ON calendars(calendar_account_id, provider_calendar_id);

-- Sync state
CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  calendar_account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  provider_calendar_id TEXT NOT NULL,
  sync_token TEXT,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS sync_state_account_calendar_idx ON sync_state(calendar_account_id, provider_calendar_id);

-- Watches
CREATE TABLE IF NOT EXISTS watches (
  id TEXT PRIMARY KEY,
  calendar_account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_channel_id TEXT NOT NULL,
  provider_resource_id TEXT,
  secret TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS watches_channel_id_idx ON watches(provider_channel_id);
CREATE INDEX IF NOT EXISTS watches_expires_at_idx ON watches(expires_at);

-- Outbound webhooks
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  end_user_id TEXT REFERENCES end_users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  fail_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS outbound_webhooks_application_idx ON outbound_webhooks(application_id);

-- Webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  outbound_webhook_id TEXT NOT NULL REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_status_next_idx ON webhook_deliveries(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx ON webhook_deliveries(outbound_webhook_id);

-- Provider webhook events (dedup)
CREATE TABLE IF NOT EXISTS provider_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_channel_id TEXT NOT NULL,
  message_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  payload JSONB
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_webhook_events_dedup_idx ON provider_webhook_events(provider, provider_channel_id, message_id);

-- Idempotency keys (24h TTL)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Rate limit buckets (used by Postgres rate limiter)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  end_user_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_application_idx ON audit_log(application_id, created_at DESC);

-- pg-boss tables (managed by pg-boss itself, but we include the schema check)
-- pg-boss will create its own tables on boss.start()
