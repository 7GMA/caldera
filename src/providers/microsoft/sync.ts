import type { ProviderContext, SyncResult, SyncEvent } from "../types.js";
import { graphFetch } from "./graphFetch.js";
import { encodeCursor, decodeCursor } from "../../lib/pagination.js";

interface GraphDeltaResponse {
  value: Array<Record<string, unknown> & { id: string; "@removed"?: { reason: string } }>;
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

export async function incrementalSync(
  ctx: ProviderContext,
  _calendarId: string,
  cursor: string | null,
): Promise<SyncResult> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  const deltaLink = decoded?.["deltaLink"] as string | undefined;

  let url = deltaLink ?? "/me/events/delta?$select=id,subject,bodyPreview,start,end,isAllDay,recurrence,isCancelled,lastModifiedDateTime,createdDateTime";
  const events: SyncEvent[] = [];
  let nextDeltaLink: string | undefined;

  while (url) {
    const res = await graphFetch<GraphDeltaResponse>(ctx, url);
    for (const e of res.value ?? []) {
      if (e["@removed"]) {
        events.push({
          type: "deleted",
          event: {
            id: e.id,
            providerEventId: e.id,
            providerCalendarId: "primary",
            calendarAccountId: ctx.calendarAccountId,
            title: "",
            start: { dateTime: "", timeZone: "UTC" },
            end: { dateTime: "", timeZone: "UTC" },
            allDay: false,
            timezone: "UTC",
            status: "cancelled",
            visibility: "default",
            transparency: "opaque",
            createdAt: "",
            updatedAt: "",
          },
        });
      } else {
        events.push({ type: cursor ? "updated" : "created", event: e as unknown as SyncEvent["event"] });
      }
    }
    if (res["@odata.nextLink"]) {
      url = res["@odata.nextLink"].replace("https://graph.microsoft.com/v1.0", "");
    } else {
      nextDeltaLink = res["@odata.deltaLink"]?.replace("https://graph.microsoft.com/v1.0", "");
      break;
    }
  }

  const nextCursor = nextDeltaLink
    ? encodeCursor({ v: 1, provider: "microsoft", deltaLink: nextDeltaLink })
    : null;

  return { events, nextCursor, hasMore: false };
}
