import { v4 as uuidv4 } from "uuid";
import type {
  ProviderContext,
  UnifiedEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsOptions,
} from "../types.js";
import type { Page } from "../../lib/pagination.js";
import type { DAVCalendar } from "tsdav";
import { makeCalDAVClient } from "./client.js";
import { parseICSEvents, makeICS } from "./ics.js";

function davCal(url: string): DAVCalendar {
  return { url } as DAVCalendar;
}

export async function listEvents(
  ctx: ProviderContext,
  opts: ListEventsOptions,
): Promise<Page<UnifiedEvent>> {
  const client = makeCalDAVClient(ctx);
  await client.login();

  const calendarIds = opts.calendarIds ?? [];
  if (calendarIds.length === 0) return { items: [], hasMore: false };

  const allEvents: UnifiedEvent[] = [];

  for (const calId of calendarIds) {
    const objects = await client.fetchCalendarObjects({
      calendar: davCal(calId),
      timeRange: { start: opts.from, end: opts.to },
    });

    for (const obj of objects) {
      if (!obj.data) continue;
      const parsed = parseICSEvents(obj.data, ctx.calendarAccountId);
      for (const ev of parsed) {
        allEvents.push({ ...ev, providerCalendarId: calId });
      }
    }
  }

  const filtered = opts.query
    ? allEvents.filter((e) => e.title.toLowerCase().includes(opts.query!.toLowerCase()))
    : allEvents;

  return { items: filtered, hasMore: false };
}

export async function getEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
): Promise<UnifiedEvent> {
  const { items } = await listEvents(ctx, {
    from: "2000-01-01T00:00:00Z",
    to: "2100-01-01T00:00:00Z",
    calendarIds: [calendarId],
  });
  const ev = items.find((e) => e.providerEventId === eventId || e.iCalUID === eventId);
  if (!ev) throw new Error(`Event not found: ${eventId}`);
  return ev;
}

export async function createEvent(
  ctx: ProviderContext,
  calendarId: string,
  input: CreateEventInput,
): Promise<UnifiedEvent> {
  const client = makeCalDAVClient(ctx);
  await client.login();

  const uid = uuidv4();
  const icsData = makeICS(uid, input);

  await client.createCalendarObject({
    calendar: davCal(calendarId),
    filename: `${uid}.ics`,
    iCalString: icsData,
  });

  return getEvent(ctx, calendarId, uid);
}

export async function updateEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<UnifiedEvent> {
  const existing = await getEvent(ctx, calendarId, eventId);
  const merged: CreateEventInput = {
    title: input.title ?? existing.title,
    start: input.start ?? existing.start,
    end: input.end ?? existing.end,
  };
  if (input.description !== undefined) merged.description = input.description;
  else if (existing.description) merged.description = existing.description;
  if (input.location !== undefined) merged.location = input.location;
  else if (existing.location) merged.location = existing.location;
  if (input.allDay !== undefined) merged.allDay = input.allDay;
  if (input.attendees) merged.attendees = input.attendees;
  if (input.recurrence) merged.recurrence = input.recurrence;
  else if (existing.recurrence?.rrule) merged.recurrence = { rrule: existing.recurrence.rrule };
  if (input.visibility) merged.visibility = input.visibility;
  else if (existing.visibility) merged.visibility = existing.visibility;
  if (input.transparency) merged.transparency = input.transparency;
  else if (existing.transparency) merged.transparency = existing.transparency;
  if (input.reminders) merged.reminders = input.reminders;
  else if (existing.reminders) merged.reminders = existing.reminders;
  if (input.color) merged.color = input.color;
  else if (existing.color) merged.color = existing.color;

  const client = makeCalDAVClient(ctx);
  await client.login();

  const uid = existing.iCalUID ?? eventId;
  const icsData = makeICS(uid, merged);

  const objects = await client.fetchCalendarObjects({ calendar: davCal(calendarId) });
  const obj = objects.find((o) => o.url.includes(uid));

  if (obj) {
    await client.updateCalendarObject({ calendarObject: { ...obj, data: icsData } });
  } else {
    await client.createCalendarObject({
      calendar: davCal(calendarId),
      filename: `${uid}.ics`,
      iCalString: icsData,
    });
  }

  return getEvent(ctx, calendarId, uid);
}

export async function deleteEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const client = makeCalDAVClient(ctx);
  await client.login();

  const objects = await client.fetchCalendarObjects({ calendar: davCal(calendarId) });
  const obj = objects.find((o) => o.url.includes(eventId));
  if (!obj) return;
  await client.deleteCalendarObject({ calendarObject: obj });
}
