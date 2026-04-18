import type { ProviderContext } from "../types.js";
import type { DAVCalendar } from "tsdav";
import { makeCalDAVClient } from "./client.js";

function davCal(url: string): DAVCalendar {
  return { url } as DAVCalendar;
}

export interface CTagMap {
  [calendarUrl: string]: string | undefined;
}

export async function fetchCTags(ctx: ProviderContext): Promise<CTagMap> {
  const client = makeCalDAVClient(ctx);
  await client.login();
  const cals = await client.fetchCalendars();
  const map: CTagMap = {};
  for (const c of cals) {
    map[c.url] = (c as Record<string, unknown>)["ctag"] as string | undefined;
  }
  return map;
}

export async function fetchETagMap(
  ctx: ProviderContext,
  calendarUrl: string,
): Promise<Record<string, string>> {
  const client = makeCalDAVClient(ctx);
  await client.login();
  const objects = await client.fetchCalendarObjects({
    calendar: davCal(calendarUrl),
  });
  const map: Record<string, string> = {};
  for (const obj of objects) {
    if (obj.url && obj.etag) map[obj.url] = obj.etag;
  }
  return map;
}
