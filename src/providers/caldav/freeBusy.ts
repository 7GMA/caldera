import type { ProviderContext, FreeBusy, BusyPeriod } from "../types.js";
import { listEvents } from "./events.js";

export async function freeBusy(
  ctx: ProviderContext,
  calendarIds: string[],
  from: string,
  to: string,
): Promise<FreeBusy[]> {
  const results: FreeBusy[] = [];

  for (const calId of calendarIds) {
    const { items } = await listEvents(ctx, { from, to, calendarIds: [calId] });
    const busy: BusyPeriod[] = items
      .filter((e) => e.transparency !== "transparent" && e.status !== "cancelled")
      .map((e) => {
        const start = "dateTime" in e.start ? e.start.dateTime : `${e.start.date}T00:00:00Z`;
        const end = "dateTime" in e.end ? e.end.dateTime : `${e.end.date}T23:59:59Z`;
        return { start, end, status: "busy" as const };
      });

    results.push({ calendarId: calId, busy });
  }

  return results;
}
