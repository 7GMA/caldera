# Microsoft Outlook Setup

## 1. Register an app in Azure AD

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory → App registrations → New registration**
2. Name: `Caldera` (or your app name)
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (multi-tenant)
4. Redirect URI (Web): `{PUBLIC_BASE_URL}/v1/auth/microsoft/callback`

## 2. Add a client secret

1. Go to *Certificates & secrets → New client secret*
2. Copy the **Value** (shown only once)

## 3. API permissions

Go to *API permissions → Add a permission → Microsoft Graph → Delegated permissions*:
- `openid`
- `offline_access`
- `User.Read`
- `Calendars.ReadWrite`

Click **Grant admin consent** (required for multi-tenant apps).

## 4. Configure Caldera

In `.env`:

```
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<client secret value>
MICROSOFT_TENANT=common   # or a specific tenant ID
```

## RRULE converter

Microsoft Graph uses a custom recurrence object (not RRULE). Caldera's `rrule.ts` converter handles:
- `FREQ=DAILY/WEEKLY/MONTHLY/YEARLY`
- `INTERVAL`
- `BYDAY` (including ordinals like `1MO`, `-1FR`)
- `BYMONTHDAY`
- `UNTIL`, `COUNT`

## Push subscriptions

MS Graph subscriptions expire after ~3 days for `/me/events`. Caldera's watch-renew worker patches them every 2 days.
