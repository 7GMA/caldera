import type { ProviderContext, UnifiedCalendar } from "../types.js";
import { makeCalDAVClient } from "./client.js";
import { shouldSkipCalendar, extractCalendarColor } from "./ics.js";

export async function listCalendars(ctx: ProviderContext): Promise<UnifiedCalendar[]> {
  const client = makeCalDAVClient(ctx);
  await client.login();
  const davCals = await client.fetchCalendars();

  return davCals
    .filter((c) => !shouldSkipCalendar(typeof c.displayName === "string" ? c.displayName : ""))
    .map((c) => {
      const raw = (c as Record<string, unknown>)["calendarColor"] ?? undefined;
      const rawName = c.displayName;
      const name = typeof rawName === "string" ? rawName : (rawName ? String(rawName) : c.url);
      const cal: import("../types.js").UnifiedCalendar = {
        id: c.url,
        providerCalendarId: c.url,
        calendarAccountId: ctx.calendarAccountId,
        name,
        isPrimary: false,
        readOnly: false,
      };
      const color = extractCalendarColor(raw);
      if (color) cal.color = color;
      const tz = (c as Record<string, unknown>)["timezone"] as string | undefined;
      if (tz) cal.timezone = tz;
      return cal;
    });
}

export async function getCalendar(
  ctx: ProviderContext,
  calendarId: string,
): Promise<UnifiedCalendar> {
  const cals = await listCalendars(ctx);
  const cal = cals.find((c) => c.providerCalendarId === calendarId);
  if (!cal) throw new Error(`Calendar not found: ${calendarId}`);
  return cal;
}
