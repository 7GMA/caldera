# Apple iCloud Setup

Apple does not support OAuth for CalDAV. Caldera uses an **app-specific password** instead.

## 1. Generate an app-specific password

1. Go to [appleid.apple.com](https://appleid.apple.com) → *Sign-In and Security → App-Specific Passwords*
2. Click **Generate an app-specific password**
3. Label: `Caldera` (or any label)
4. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

> **Security note**: App-specific passwords bypass 2FA. Store it only in Caldera's encrypted storage. Rotate it immediately if leaked.

## 2. Connect via API

No `.env` changes needed. Connect at runtime:

```bash
curl -sX POST \
  -H "Authorization: Bearer $K" \
  -H "X-End-User-Id: user_1" \
  -H "Content-Type: application/json" \
  -d '{"email": "me@icloud.com", "app_specific_password": "xxxx-xxxx-xxxx-xxxx"}' \
  http://localhost:3000/v1/auth/apple/connect
```

Caldera:
1. Validates credentials by connecting to `caldav.icloud.com` via `tsdav`
2. Encrypts the password with AES-256-GCM
3. Returns `{"account_id": "..."}`

## CalDAV specifics

- Server: `https://caldav.icloud.com`
- Auth: HTTP Basic (email + app-specific password)
- Push: Not available — Caldera polls every 60 seconds using ctag + ETag diffing
- Sync: etag-based incremental sync (no native sync token)

## Generic CalDAV

Caldera also supports generic CalDAV providers (Fastmail, Nextcloud, etc.) via `POST /v1/auth/caldav/connect` with a custom `server_url`.
