# Caldera

**Open-source unified REST API for Google Calendar, Microsoft Outlook & Apple iCloud.**  
Self-hostable alternative to Cronofy.

---

## What is Caldera?

Caldera gives you a single vendor-neutral HTTP API in front of all three major calendar providers. Connect a Google, Microsoft, or Apple Calendar account once; then use identical REST endpoints to read, write, search, and sync events — no provider-specific SDK or OAuth plumbing needed in your app.

| Feature | Google | Microsoft | Apple/CalDAV |
|---|---|---|---|
| List / Get Events | ✅ | ✅ | ✅ |
| Create / Update / Delete | ✅ | ✅ | ✅ |
| Incremental Sync | ✅ syncToken | ✅ $delta | ✅ ctag/ETag |
| Push Webhooks | ✅ events.watch | ✅ subscriptions | polling fallback |
| Free/Busy | ✅ | ✅ | computed |
| Search | ✅ | ✅ | in-memory |

---

## Quickstart

```bash
git clone https://github.com/7GMA/caldera.git
cd caldera
cp .env.example .env
# edit .env — set CALDERA_ENCRYPTION_KEY, STATE_HMAC_SECRET, DATABASE_URL, PUBLIC_BASE_URL
# and at least GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for a first test

docker compose -f docker/docker-compose.yml up --build

curl http://localhost:3000/healthz
# {"status":"ok"}

curl http://localhost:3000/v1
# {"name":"caldera","version":"0.1.0","docs":"/docs"}

# Open Swagger UI
open http://localhost:3000/docs
```

> Full quickstart with OAuth flow, event listing, and outbound webhooks: [docs/quickstart.md](docs/quickstart.md)

---

## Provider setup

- [Google Calendar](docs/providers/google.md) — GCP project + OAuth consent
- [Microsoft / Entra](docs/providers/microsoft.md) — App registration + API permissions
- [Apple iCloud](docs/providers/apple.md) — App-specific password (no OAuth)

---

## Development

```bash
pnpm install
cp .env.example .env   # configure

# run local postgres
docker compose -f docker/docker-compose.yml up postgres -d

# run migrations
pnpm db:migrate

# start dev server (hot reload)
pnpm dev

# typecheck + lint + test
pnpm typecheck && pnpm lint && pnpm test
```

---

## Architecture

- **Node 22 + TypeScript 5** — Fastify 5, Zod, Drizzle ORM
- **PostgreSQL 16** — tokens encrypted at rest (AES-256-GCM), job queue (pg-boss)
- **Three provider adapters** — extracted from [Daily](https://github.com/7GMA/daily), hardened with retry/backoff, pagination, and incremental sync
- **Three-tier identity** — application → api_key → end_user (Cronofy-compatible model)

See [docs/concepts/auth.md](docs/concepts/auth.md) for the full auth model.

## Used in production

[daily](https://usedaily.site) — an AI-powered calendar assistant — uses Caldera as its calendar backend, connecting Google, Microsoft, and Apple accounts through this API.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome.

## License

[Apache-2.0](LICENSE)
