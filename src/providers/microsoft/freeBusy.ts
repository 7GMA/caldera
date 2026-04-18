import type { ProviderContext, FreeBusy } from "../types.js";
import { graphFetch } from "./graphFetch.js";

export async function freeBusy(
  ctx: ProviderContext,
  calendarIds: string[],
  from: string,
  to: string,
): Promise<FreeBusy[]> {
  // MS getSchedule requires email addresses, so we use calendarIds as schedule addresses
  const res = await graphFetch<{
    value: Array<{ scheduleId: string; busyIntervals: Array<{ start: { dateTime: string }; end: { dateTime: string }; status: string }> }>;
  }>(ctx, "/me/calendar/getSchedule", {
    method: "POST",
    body: JSON.stringify({
      schedules: calendarIds,
      startTime: { dateTime: from, timeZone: "UTC" },
      endTime: { dateTime: to, timeZone: "UTC" },
      availabilityViewInterval: 15,
    }),
  });

  return (res.value ?? []).map((s) => ({
    calendarId: s.scheduleId,
    busy: (s.busyIntervals ?? []).map((b) => ({
      start: b.start.dateTime,
      end: b.end.dateTime,
      status: b.status === "tentative" ? "tentative" : "busy",
    })),
  }));
}
