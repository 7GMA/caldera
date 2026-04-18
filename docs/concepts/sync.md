# Incremental Sync

`GET /v1/sync?account_id=<id>&calendar_id=<cal>&cursor=<base64>`

On first call (no cursor), returns all events as `type: "created"`.
On subsequent calls, returns only changes since the last cursor.

## Response

```json
{
  "events": [
    { "type": "created", "event": { ...UnifiedEvent } },
    { "type": "updated", "event": { ...UnifiedEvent } },
    { "type": "deleted", "event": { "id": "...", "status": "cancelled", ... } }
  ],
  "next_cursor": "base64url...",
  "has_more": false
}
```

Store `next_cursor` and pass it on the next call.

## Provider implementations

### Google (syncToken)

1. Initial sync: `events.list()` paginated via `pageToken`, final response includes `nextSyncToken`
2. Incremental: `events.list({ syncToken })` — only changed events returned
3. HTTP 410 Gone: sync token expired → Caldera transparently does a full resync and returns a fresh cursor

### Microsoft ($delta)

1. Initial: `GET /me/calendars/{id}/events/delta` paginated via `@odata.nextLink`
2. Final page includes `@odata.deltaLink` — stored as cursor
3. Incremental: fetch the delta link, get only changes
4. Deletes come as `{ "@removed": { "reason": "deleted" } }` in the value array

### Apple/CalDAV (ETag diff)

No native sync token. Caldera stores a `{url: etag}` map in `sync_state.sync_token`.

1. Fetch all calendar objects with their ETags
2. Compare to stored map:
   - New URL → `created`
   - Changed ETag → `updated`
   - Missing URL → `deleted`
3. Store new ETag map as next cursor

## Cursor format

Cursors are base64url-encoded JSON:

```json
{
  "v": 1,
  "provider": "google",
  "calendarId": "primary",
  "syncToken": "...",
  "snapshotAt": "2026-04-18T00:00:00Z"
}
```

Cursors are opaque to the API consumer — never parse them directly.
