# Quickstart

Get Caldera running in under 5 minutes.

## Prerequisites

- Docker + Docker Compose
- A Google Cloud project (for Google Calendar) or Azure AD app (for Microsoft)
- An Apple app-specific password (for iCloud)

## 1. Clone and configure

```bash
git clone https://github.com/7GMA/caldera.git
cd caldera
cp .env.example .env
```

Edit `.env` and set the required values:

```
CALDERA_ENCRYPTION_KEY=<64-char hex — generate with: openssl rand -hex 32>
STATE_HMAC_SECRET=<64-char hex — generate with: openssl rand -hex 32>
DATABASE_URL=postgres://caldera:caldera@localhost:5432/caldera
PUBLIC_BASE_URL=http://localhost:3000

# At least one provider:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 2. Start

```bash
docker compose up --build
```

## 3. Create a tenant

```bash
pnpm exec tsx scripts/seed.ts --name "My App" --email "me@example.com"
# → api_key=cld_live_xxxxx
export K=cld_live_xxxxx
```

## 4. Connect Google Calendar

```bash
# Get OAuth URL
URL=$(curl -sH "Authorization: Bearer $K" -H "X-End-User-Id: user_1" \
  "http://localhost:3000/v1/auth/google/url?redirect_uri=http://localhost/done" | jq -r .url)

open "$URL"
# → consent in browser → redirected to http://localhost/done?account_id=<uuid>
export ACCOUNT_ID=<uuid from redirect>
```

## 5. List calendars and events

```bash
# Calendars
curl -sH "Authorization: Bearer $K" -H "X-End-User-Id: user_1" \
  "http://localhost:3000/v1/calendars?account_id=$ACCOUNT_ID" | jq .

# Events (next 7 days)
FROM=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TO=$(date -u -v+7d +"%Y-%m-%dT%H:%M:%SZ")   # macOS; Linux: date -u -d "+7 days" ...
curl -sH "Authorization: Bearer $K" -H "X-End-User-Id: user_1" \
  "http://localhost:3000/v1/events?account_id=$ACCOUNT_ID&from=$FROM&to=$TO" | jq .
```

## 6. Create an event

```bash
curl -sX POST \
  -H "Authorization: Bearer $K" -H "X-End-User-Id: user_1" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "account_id": "'"$ACCOUNT_ID"'",
    "calendar_id": "primary",
    "title": "Hello from Caldera",
    "start": {"dateTime": "2026-04-20T09:00:00", "timeZone": "Europe/Berlin"},
    "end":   {"dateTime": "2026-04-20T10:00:00", "timeZone": "Europe/Berlin"}
  }' \
  http://localhost:3000/v1/events | jq .
```

## Next steps

- [Connect Microsoft](providers/microsoft.md)
- [Connect Apple iCloud](providers/apple.md)
- [Outbound webhooks](concepts/webhooks.md)
- [Incremental sync](concepts/sync.md)
- [API Reference](/docs) (Swagger UI)
