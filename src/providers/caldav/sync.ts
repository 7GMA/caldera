import type { ProviderContext, SyncResult, SyncEvent } from "../types.js";
import type { DAVCalendar } from "tsdav";
import { makeCalDAVClient } from "./client.js";
import { parseICSEvents } from "./ics.js";
import { encodeCursor, decodeCursor } from "../../lib/pagination.js";

function davCal(url: string): DAVCalendar {
  return { url } as DAVCalendar;
}

export async function incrementalSync(
  ctx: ProviderContext,
  calendarId: string,
  cursor: string | null,
): Promise<SyncResult> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  const prevETagMap = (decoded?.["etagMap"] as Record<string, string>) ?? {};

  const client = makeCalDAVClient(ctx);
  await client.login();

  const objects = await client.fetchCalendarObjects({
    calendar: davCal(calendarId),
  });

  const newETagMap: Record<string, string> = {};
  const events: SyncEvent[] = [];

  for (const obj of objects) {
    if (!obj.url || !obj.etag) continue;
    newETagMap[obj.url] = obj.etag;

    const prevEtag = prevETagMap[obj.url];
    if (!obj.data) continue;

    const parsed = parseICSEvents(obj.data, ctx.calendarAccountId);
    for (const ev of parsed) {
      const mapped = { ...ev, providerCalendarId: calendarId };
      if (!prevEtag) {
        events.push({ type: "created", event: mapped });
      } else if (prevEtag !== obj.etag) {
        events.push({ type: "updated", event: mapped });
      }
    }
  }

  for (const url of Object.keys(prevETagMap)) {
    if (!newETagMap[url]) {
      events.push({
        type: "deleted",
        event: {
          id: url,
          providerEventId: url,
          providerCalendarId: calendarId,
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
    }
  }

  const nextCursor = encodeCursor({ v: 1, provider: "caldav", calendarId, etagMap: newETagMap });
  return { events, nextCursor, hasMore: false };
}
