import type { ProviderContext, FreeBusy } from "../types.js";
import { makeGoogleClient } from "./client.js";
import { withRetry } from "../../lib/retry.js";

export async function freeBusy(
  ctx: ProviderContext,
  calendarIds: string[],
  from: string,
  to: string,
): Promise<FreeBusy[]> {
  const cal = makeGoogleClient(ctx);
  const res = await withRetry(() =>
    cal.freebusy.query({
      requestBody: {
        timeMin: from,
        timeMax: to,
        items: calendarIds.map((id) => ({ id })),
      },
    }),
  );
  return calendarIds.map((id) => ({
    calendarId: id,
    busy: (res.data.calendars?.[id]?.busy ?? []).map((b) => ({
      start: b.start ?? "",
      end: b.end ?? "",
    })),
  }));
}
