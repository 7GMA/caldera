# Webhooks

Caldera supports two webhook directions:

1. **Inbound** — provider → Caldera (Google/Microsoft push notifications)
2. **Outbound** — Caldera → your backend

## Outbound webhooks

Register a webhook endpoint:

```bash
curl -sX POST \
  -H "Authorization: Bearer $K" -H "X-End-User-Id: user_1" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourapp.com/hooks/caldera", "event_types": ["event.created", "event.updated", "event.deleted"]}' \
  http://localhost:3000/v1/webhooks
# → {"id": "...", "secret": "..."}  ← store the secret!
```

### Verifying signatures

Each delivery includes `X-Caldera-Signature: t=<unix>,v1=<hex>`.

Verify:
```js
const [tPart, v1Part] = header.split(",");
const t = tPart.replace("t=", "");
const sig = v1Part.replace("v1=", "");
const expected = hmacSha256(secret, `${t}.${body}`);
if (!timingSafeEqual(expected, sig)) throw new Error("Invalid signature");
// Also check: Math.abs(Date.now()/1000 - parseInt(t)) < 300 (5-min skew window)
```

### Retry schedule

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 2 minutes |
| 4 | 10 minutes |
| 5 | 1 hour |
| 6 | 6 hours |
| 7 | 24 hours |
| 8 | 3 days → `dead` |

### Event types

- `event.created`
- `event.updated`
- `event.deleted`
- `account.refresh_failed`
- `watch.expired` (when renewal fails)

## Inbound webhooks (provider push)

Caldera exposes:
- `POST /internal/webhooks/google` — Google Calendar push
- `POST /internal/webhooks/microsoft` — Microsoft Graph change notification

These are **not** authenticated by API key. Instead, each watch/subscription has its own `secret` stored in the `watches` table. Google sends it as `x-goog-channel-token`; Microsoft as `clientState`. Caldera verifies with timing-safe comparison.

### Microsoft validation handshake

When creating a subscription, Microsoft sends a `POST ?validationToken=<token>` to the notification URL. Caldera responds with the token as `text/plain` within 10 seconds. This is handled automatically.
