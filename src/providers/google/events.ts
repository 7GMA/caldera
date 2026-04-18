import type { calendar_v3 } from "googleapis";
import type {
  ProviderContext,
  UnifiedEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsOptions,
  EventDateTime,
  EventRecurrence,
  EventAttendee,
} from "../types.js";
import type { Page } from "../../lib/pagination.js";
import { makeGoogleClient } from "./client.js";
import { withRetry } from "../../lib/retry.js";
import { v4 as uuidv4 } from "uuid";

export function mapEvent(e: calendar_v3.Schema$Event, calendarAccountId: string): UnifiedEvent {
  const start = e.start?.dateTime
    ? { dateTime: e.start.dateTime, timeZone: e.start.timeZone ?? "UTC" }
    : { date: e.start?.date ?? "" };
  const end = e.end?.dateTime
    ? { dateTime: e.end.dateTime, timeZone: e.end.timeZone ?? "UTC" }
    : { date: e.end?.date ?? "" };

  const ev: UnifiedEvent = {
    id: e.id ?? uuidv4(),
    providerEventId: e.id ?? "",
    providerCalendarId: e.organizer?.email ?? "primary",
    calendarAccountId,
    title: e.summary ?? "(no title)",
    start,
    end,
    allDay: !e.start?.dateTime,
    timezone: (start as EventDateTime).timeZone ?? "UTC",
    status: (e.status as UnifiedEvent["status"]) ?? "confirmed",
    visibility: (e.visibility as UnifiedEvent["visibility"]) ?? "default",
    transparency: e.transparency === "transparent" ? "transparent" : "opaque",
    createdAt: e.created ?? new Date().toISOString(),
    updatedAt: e.updated ?? new Date().toISOString(),
  };

  if (e.iCalUID) ev.iCalUID = e.iCalUID;
  if (e.description) ev.description = e.description;
  if (e.location) ev.location = { displayName: e.location };
  if (e.colorId) ev.color = `colorId:${e.colorId}`;
  if (e.etag) ev.etag = e.etag;

  if (e.recurrence || e.recurringEventId) {
    const rec: EventRecurrence = {
      isInstance: !!e.recurringEventId && !e.recurrence,
      isException: e.status === "cancelled" && !!e.recurringEventId,
    };
    const rrule = e.recurrence?.[0]?.replace(/^RRULE:/, "");
    if (rrule) rec.rrule = rrule;
    if (e.recurringEventId) rec.masterEventId = e.recurringEventId;
    ev.recurrence = rec;
  }

  if (e.organizer?.email) {
    ev.organizer = { email: e.organizer.email };
    if (e.organizer.displayName) ev.organizer.displayName = e.organizer.displayName;
    if (e.organizer.self) ev.organizer.self = e.organizer.self;
  }

  if (e.attendees?.length) {
    ev.attendees = e.attendees.map((a) => {
      const att: EventAttendee = {
        email: a.email ?? "",
        responseStatus: (a.responseStatus as EventAttendee["responseStatus"]) ?? "needsAction",
      };
      if (a.displayName) att.displayName = a.displayName;
      if (a.optional) att.optional = a.optional;
      return att;
    });
  }

  if (e.reminders?.overrides?.length) {
    ev.reminders = e.reminders.overrides.map((r) => ({
      method: r.method as "email" | "popup",
      minutesBefore: r.minutes ?? 0,
    }));
  }

  const entryPoint = e.conferenceData?.entryPoints?.[0];
  if (entryPoint?.uri) {
    ev.conferencing = {
      provider: "google_meet",
      joinUrl: entryPoint.uri,
    };
    if (e.conferenceData?.conferenceId) ev.conferencing.conferenceId = e.conferenceData.conferenceId;
  }

  return ev;
}

export async function listEvents(
  ctx: ProviderContext,
  opts: ListEventsOptions,
): Promise<Page<UnifiedEvent>> {
  const cal = makeGoogleClient(ctx);
  const calendarIds = opts.calendarIds?.length
    ? opts.calendarIds
    : await getAllCalendarIds(ctx);

  const allEvents: UnifiedEvent[] = [];
  for (const calId of calendarIds) {
    let pageToken: string | undefined;
    do {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId: calId,
        timeMin: opts.from,
        timeMax: opts.to,
        singleEvents: opts.singleEvents !== false,
        orderBy: "startTime",
        maxResults: Math.min(opts.maxResults ?? 250, 250),
        showDeleted: opts.showDeleted,
      };
      if (pageToken) params.pageToken = pageToken;
      if (opts.query) params.q = opts.query;

      const res = await withRetry(() => cal.events.list(params));
      for (const e of res.data.items ?? []) {
        allEvents.push(mapEvent(e, ctx.calendarAccountId));
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  return { items: allEvents, hasMore: false };
}

export async function getEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
): Promise<UnifiedEvent> {
  const cal = makeGoogleClient(ctx);
  const res = await withRetry(() => cal.events.get({ calendarId, eventId }));
  return mapEvent(res.data, ctx.calendarAccountId);
}

export async function createEvent(
  ctx: ProviderContext,
  calendarId: string,
  input: CreateEventInput,
): Promise<UnifiedEvent> {
  const cal = makeGoogleClient(ctx);
  const body: calendar_v3.Schema$Event = {
    summary: input.title,
    start: "date" in input.start
      ? { date: input.start.date }
      : { dateTime: input.start.dateTime, timeZone: input.start.timeZone },
    end: "date" in input.end
      ? { date: input.end.date }
      : { dateTime: input.end.dateTime, timeZone: input.end.timeZone },
  };
  if (input.description) body.description = input.description;
  if (input.location?.displayName) body.location = input.location.displayName;
  if (input.attendees?.length) {
    body.attendees = input.attendees.map((a) => {
      const att: calendar_v3.Schema$EventAttendee = { email: a.email };
      if (a.displayName) att.displayName = a.displayName;
      if (a.optional) att.optional = a.optional;
      return att;
    });
  }
  if (input.recurrence?.rrule) body.recurrence = [`RRULE:${input.recurrence.rrule}`];
  if (input.visibility && input.visibility !== "default") body.visibility = input.visibility;
  if (input.transparency) body.transparency = input.transparency;

  const res = await withRetry(() => cal.events.insert({ calendarId, requestBody: body }));
  return mapEvent(res.data, ctx.calendarAccountId);
}

export async function updateEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<UnifiedEvent> {
  const cal = makeGoogleClient(ctx);
  const patch: calendar_v3.Schema$Event = {};
  if (input.title !== undefined) patch.summary = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.location !== undefined) patch.location = input.location?.displayName;
  if (input.start !== undefined) {
    patch.start = "date" in input.start
      ? { date: input.start.date }
      : { dateTime: input.start.dateTime, timeZone: input.start.timeZone };
  }
  if (input.end !== undefined) {
    patch.end = "date" in input.end
      ? { date: input.end.date }
      : { dateTime: input.end.dateTime, timeZone: input.end.timeZone };
  }
  if (input.visibility !== undefined) {
    patch.visibility = input.visibility === "default" ? undefined : input.visibility;
  }
  if (input.transparency !== undefined) patch.transparency = input.transparency;
  const res = await withRetry(() => cal.events.patch({ calendarId, eventId, requestBody: patch }));
  return mapEvent(res.data, ctx.calendarAccountId);
}

export async function deleteEvent(
  ctx: ProviderContext,
  calendarId: string,
  eventId: string,
  opts?: { notifyAttendees?: boolean },
): Promise<void> {
  const cal = makeGoogleClient(ctx);
  const params: calendar_v3.Params$Resource$Events$Delete = { calendarId, eventId };
  if (opts?.notifyAttendees) params.sendUpdates = "all";
  await withRetry(() => cal.events.delete(params));
}

export async function getAllCalendarIds(ctx: ProviderContext): Promise<string[]> {
  const { listCalendars } = await import("./calendars.js");
  const cals = await listCalendars(ctx);
  return cals.map((c) => c.providerCalendarId);
}
