# Authentication

Caldera uses a three-tier identity model.

## Tiers

| Tier | Entity | Header |
|------|--------|--------|
| 1 | Application (your backend) | `Authorization: Bearer cld_live_...` |
| 2 | End user | `X-End-User-Id: <opaque string>` |
| 3 | Calendar account | `account_id=<uuid>` query param / body |

**Application**: A tenant registered in Caldera. Created via `pnpm exec tsx scripts/seed.ts`.

**End user**: Your app's user. Pass any stable opaque ID (e.g. your database's user UUID). Caldera lazily creates an internal record on first use.

**Calendar account**: One provider connection (Google, Microsoft, or Apple). A single end user can have multiple calendar accounts.

## API key format

```
cld_live_<base64url(32 random bytes)>
```

The plaintext key is shown only once at creation. Caldera stores a SHA-256 hash; the plaintext is never persisted.

## OAuth flow

```
GET /v1/auth/google/url?end_user_id=user_42&redirect_uri=https://yourapp.com/callback
→ { "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

The `state` parameter is HMAC-SHA256 signed with `STATE_HMAC_SECRET` and expires after 10 minutes.

After consent:
```
GET /v1/auth/google/callback?code=...&state=...
→ 302 https://yourapp.com/callback?account_id=<uuid>
```

## Token storage

Access and refresh tokens are encrypted at rest with AES-256-GCM before storage. The encryption key is `CALDERA_ENCRYPTION_KEY` (64-char hex = 32 bytes).

The format is: `version(1 byte) || iv(12 bytes) || auth_tag(16 bytes) || ciphertext`.

## Token refresh

A pg-boss cron job runs every minute, refreshing tokens expiring within 5 minutes. After 5 consecutive failures, the account status is set to `refresh_failed` and an outbound webhook `account.refresh_failed` is dispatched.
