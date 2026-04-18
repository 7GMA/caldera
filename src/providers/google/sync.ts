import type { calendar_v3 } from "googleapis";
import type { ProviderContext, SyncResult, SyncEvent } from "../types.js";
import { makeGoogleClient } from "./client.js";
import { mapEvent } from "./events.js";
import { withRetry } from "../../lib/retry.js";
import { encodeCursor, decodeCursor } from "../../lib/pagination.js";

export async function incrementalSync(
  ctx: ProviderContext,
  calendarId: string,
  cursor: string | null,
): Promise<SyncResult> {
  const cal = makeGoogleClient(ctx);
  let syncToken: string | undefined;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    syncToken = decoded["syncToken"] as string | undefined;
  }

  const events: SyncEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    do {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        showDeleted: true,
        singleEvents: true,
        maxResults: 250,
      };
      if (syncToken) params.syncToken = syncToken;
      if (pageToken) params.pageToken = pageToken;

      const res = await withRetry(() => cal.events.list(params));
      for (const e of res.data.items ?? []) {
        const type = e.status === "cancelled" ? "deleted" : cursor ? "updated" : "created";
        events.push({ type, event: mapEvent(e, ctx.calendarAccountId) });
      }
      pageToken = res.data.nextPageToken ?? undefined;
      nextSyncToken = res.data.nextSyncToken ?? undefined;
    } while (pageToken);
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code;
    if (status === 410) {
      return incrementalSync(ctx, calendarId, null);
    }
    throw err;
  }

  const nextCursor = nextSyncToken
    ? encodeCursor({ v: 1, provider: "google", calendarId, syncToken: nextSyncToken })
    : null;

  return { events, nextCursor, hasMore: false };
}
