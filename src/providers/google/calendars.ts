import type { ProviderContext, UnifiedCalendar } from "../types.js";
import { makeGoogleClient } from "./client.js";
import { withRetry } from "../../lib/retry.js";

function mapCalendar(c: { id?: string | null; summary?: string | null; backgroundColor?: string | null; primary?: boolean | null; accessRole?: string | null; timeZone?: string | null }, calendarAccountId: string): UnifiedCalendar {
  const cal: UnifiedCalendar = {
    id: c.id ?? "",
    providerCalendarId: c.id ?? "",
    calendarAccountId,
    name: c.summary ?? "",
    isPrimary: c.primary === true,
    readOnly: c.accessRole === "reader" || c.accessRole === "freeBusyReader",
  };
  if (c.backgroundColor) cal.color = c.backgroundColor;
  if (c.timeZone) cal.timezone = c.timeZone;
  return cal;
}

export async function getCalendar(ctx: ProviderContext, calendarId: string): Promise<UnifiedCalendar> {
  const cal = makeGoogleClient(ctx);
  const res = await withRetry(() => cal.calendarList.get({ calendarId }));
  return mapCalendar(res.data, ctx.calendarAccountId);
}

export async function listCalendars(ctx: ProviderContext): Promise<UnifiedCalendar[]> {
  const cal = makeGoogleClient(ctx);
  const res = await withRetry(() =>
    cal.calendarList.list({ minAccessRole: "reader", maxResults: 250 }),
  );
  return (res.data.items ?? []).map((c) => mapCalendar(c, ctx.calendarAccountId));
}
