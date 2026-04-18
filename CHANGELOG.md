# Changelog

All notable changes to Caldera are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-04-18

### Added

- **Three-provider support**: Google Calendar, Microsoft Outlook (Graph), and Apple iCloud (CalDAV)
- **Unified REST API** with consistent event model (UnifiedEvent v2) across all providers
- **OAuth broker** for Google and Microsoft; app-specific password flow for Apple
- **CRUD operations** for events and calendars across all three providers
- **Incremental sync** via `GET /v1/sync`:
  - Google: `syncToken`-based with HTTP 410 full-resync fallback
  - Microsoft: `$delta` link chain
  - Apple/CalDAV: ctag + ETag diff
- **Free/busy** fan-out (`POST /v1/free-busy`): native Google/MS APIs + computed for Apple
- **Push notifications**: Google `events.watch` + Microsoft Graph subscriptions
- **Outbound webhooks** with HMAC-SHA256 signatures and 8-step retry schedule
- **Watch renewal worker**: auto-renews expiring channels 24h before expiry
- **CalDAV polling worker**: ctag-based change detection every 60 seconds
- **Token refresh worker**: proactive refresh 5 minutes before expiry
- **Webhook deduplication**: `provider_webhook_events` table with unique index on `(provider, channel_id, message_id)`
- **Idempotency** via `Idempotency-Key` header (24h TTL)
- **Rate limiting** via Postgres-backed sliding window
- **AES-256-GCM** token encryption at rest with key-version prefix for rotation
- **HMAC-signed OAuth state** tokens (10-minute TTL)
- **RRULE ↔ MS Graph recurrence** bidirectional converter
- **Microsoft timezone conversion** (Windows TZ IDs → IANA via mapping)
- **Docker** multi-stage build (builder: node:22-alpine, runtime: distroless)
- **`docker compose up`** one-command local setup with Postgres
- **OpenAPI / Swagger UI** at `/docs`
- **Health endpoints**: `/healthz`, `/readyz`, `/metrics` (Prometheus)
- **Apache-2.0 license**

### Security fixes (vs. Daily reference implementation)

- Webhook secrets are now always generated, persisted, and verified (Google `x-goog-channel-token` / MS `clientState`)
- No hardcoded timezones — per-account IANA timezone
- No hardcoded `primary` calendar ID
- Tokens for secondary accounts are now refreshed by the worker (previously never refreshed)

[1.0.0]: https://github.com/7GMA/caldera/releases/tag/v1.0.0
