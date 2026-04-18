# Google Calendar Setup

## 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API** under *APIs & Services → Library*

## 2. Create OAuth credentials

1. Go to *APIs & Services → Credentials → Create Credentials → OAuth client ID*
2. Application type: **Web application**
3. Add authorized redirect URIs:
   - `{PUBLIC_BASE_URL}/v1/auth/google/callback`
   - e.g. `http://localhost:3000/v1/auth/google/callback`
4. Copy **Client ID** and **Client Secret**

## 3. Configure Caldera

In `.env`:

```
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
```

## Scopes requested

Caldera requests:
- `openid`
- `email`
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

## Push notifications (optional)

Push notifications require a publicly accessible `PUBLIC_BASE_URL`. For local dev, use ngrok:

```bash
ngrok http 3000
# Set PUBLIC_BASE_URL=https://<ngrok-id>.ngrok.io in .env
```

The watch channel expires after 7 days. Caldera's watch-renew worker handles renewal automatically.

## Rate limits

Google Calendar API: 1 million queries/day per project, 500 queries/100s per user.
Caldera's retry wrapper (exponential backoff with jitter) handles transient 429s.
