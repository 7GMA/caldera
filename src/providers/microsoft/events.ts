import type {
  ProviderContext,
  UnifiedEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsOptions,
  EventDateTime,
  EventAttendee,
} from "../types.js";
import type { Page } from "../../lib/pagination.js";
import { graphFetch, graphFetchAll } from "./graphFetch.js";
import { rruleToGraph, graphToRrule } from "./rrule.js";
import { v4 as uuidv4 } from "uuid";

interface GraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content: string; contentType: string };
  location?: { displayName?: string; address?: { street?: string; city?: string; countryOrRegion?: string } };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
  recurrence?: { pattern: unknown; range: unknown };
  seriesMasterId?: string;
  type?: string;
  attendees?: Array<{ emailAddress: { address: string; name?: string }; status: { response: string }; type?: string }>;
  organizer?: { emailAddress: { address: string; name?: string } };
  showAs?: string;
  sensitivity?: string;
  isCancelled?: boolean;
  onlineMeeting?: { joinUrl?: string };
  isOnlineMeeting?: boolean;
  etag?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  iCalUId?: string;
  reminderMinutesBeforeStart?: number;
}

function mapEvent(e: GraphEvent, calendarAccountId: string): UnifiedEvent {
  const startDt = e.start.dateTime.endsWith("Z") ? e.start.dateTime : `${e.start.dateTime}Z`;
  const endDt = e.end.dateTime.endsWith("Z") ? e.end.dateTime : `${e.end.dateTime}Z`;

  const statusMap: Record<string, UnifiedEvent["status"]> = {
    free: "confirmed", tentative: "tentative", busy: "confirmed",
    oof: "confirmed", workingElsewhere: "confirmed", unknown: "confirmed",
  };

  return {
    id: e.id,
    providerEventId: e.id,
    providerCalendarId: "primary",
    calendarAccountId,
    iCalUID: e.iCalUId,
    title: e.subject ?? "(no title)",
    description: e.body?.contentType === "text" ? e.body.content : e.bodyPreview,
    descriptionHtml: e.body?.contentType === "html" ? e.body.content : undefined,
    location: e.location?.displayName ? { displayName: e.location.displayName } : undefined,
    start: e.isAllDay ? { date: e.start.dateTime.slice(0, 10) } : { dateTime: startDt, timeZone: e.start.timeZone },
    end: e.isAllDay ? { date: e.end.dateTime.slice(0, 10) } : { dateTime: endDt, timeZone: e.end.timeZone },
    allDay: e.isAllDay ?? false,
    timezone: e.start.timeZone ?? "UTC",
    recurrence: e.recurrence
      ? {
          rrule: graphToRrule(e.recurrence as Parameters<typeof graphToRrule>[0]),
          masterEventId: e.seriesMasterId,
          isInstance: e.type === "occurrence" || e.type === "exception",
          isException: e.type === "exception",
        }
      : e.seriesMasterId ? { masterEventId: e.seriesMasterId, isInstance: true, isException: false } : undefined,
    organizer: e.organizer?.emailAddress.address
      ? { email: e.organizer.emailAddress.address, displayName: e.organizer.emailAddress.name }
      : undefined,
    attendees: e.attendees?.map((a) => {
      const responseMap: Record<string, EventAttendee["responseStatus"]> = {
        accepted: "accepted", declined: "declined", tentativelyAccepted: "tentative",
        none: "needsAction", notResponded: "needsAction",
      };
      const att: EventAttendee = {
        email: a.emailAddress.address,
        responseStatus: responseMap[a.status.response] ?? "needsAction",
        role: a.type === "required" ? "required" : "optional",
      };
      if (a.emailAddress.name) att.displayName = a.emailAddress.name;
      return att;
    }),
    status: e.isCancelled ? "cancelled" : statusMap[e.showAs ?? "busy"] ?? "confirmed",
    visibility: ({ normal: "default", personal: "private", private: "private", confidential: "confidential" } as Record<string, UnifiedEvent["visibility"]>)[e.sensitivity ?? "normal"] ?? "default",
    transparency: e.showAs === "free" ? "transparent" : "opaque",
    reminders: e.reminderMinutesBeforeStart != null
      ? [{ method: "popup" as const, minutesBefore: e.reminderMinutesBeforeStart }]
      : undefined,
    conferencing: e.onlineMeeting?.joinUrl
      ? { provider: "microsoft_teams", joinUrl: e.onlineMeeting.joinUrl }
      : undefined,
    createdAt: e.createdDateTime ?? new Date().toISOString(),
    updatedAt: e.lastModifiedDateTime ?? new Date().toISOString(),
  };
}

export async function listEvents(ctx: ProviderContext, opts: ListEventsOptions): Promise<Page<UnifiedEvent>> {
  const params = new URLSearchParams({
    startDateTime: opts.from,
    endDateTime: opts.to,
    "$select": "id,subject,bodyPreview,body,location,start,end,isAllDay,recurrence,seriesMasterId,type,attendees,organizer,showAs,sensitivity,isCancelled,onlineMeeting,isOnlineMeeting,createdDateTime,lastModifiedDateTime,iCalUId,reminderMinutesBeforeStart",
    "$orderby": "start/dateTime",
    "$top": String(Math.min(opts.maxResults ?? 250, 250)),
    ...(opts.query ? { "$search": `"${opts.query}"` } : {}),
  });
  const items = await graphFetchAll<GraphEvent>(ctx, `/me/calendarView?${params}`);
  return { items: items.map((e) => mapEvent(e, ctx.calendarAccountId)), hasMore: false };
}

export async function getEvent(ctx: ProviderContext, _calendarId: string, eventId: string): Promise<UnifiedEvent> {
  const e = await graphFetch<GraphEvent>(ctx, `/me/events/${eventId}`);
  return mapEvent(e, ctx.calendarAccountId);
}

export async function createEvent(ctx: ProviderContext, _calendarId: string, input: CreateEventInput): Promise<UnifiedEvent> {
  const tz = ("timeZone" in input.start ? input.start.timeZone : undefined) ?? "UTC";
  const body: Record<string, unknown> = {
    subject: input.title,
    body: input.description ? { contentType: "text", content: input.description } : undefined,
    location: input.location?.displayName ? { displayName: input.location.displayName } : undefined,
    start: "date" in input.start ? { dateTime: `${input.start.date}T00:00:00`, timeZone: tz } : { dateTime: input.start.dateTime, timeZone: input.start.timeZone },
    end: "date" in input.end ? { dateTime: `${input.end.date}T00:00:00`, timeZone: tz } : { dateTime: input.end.dateTime, timeZone: input.end.timeZone },
    isAllDay: input.allDay,
    attendees: input.attendees?.map((a) => ({ emailAddress: { address: a.email, name: a.displayName }, type: a.role ?? "required" })),
    recurrence: input.recurrence?.rrule
      ? rruleToGraph(input.recurrence.rrule, "date" in input.start ? input.start.date : input.start.dateTime.slice(0, 10))
      : undefined,
  };
  const e = await graphFetch<GraphEvent>(ctx, "/me/events", { method: "POST", body: JSON.stringify(body) });
  return mapEvent(e, ctx.calendarAccountId);
}

export async function updateEvent(ctx: ProviderContext, _calendarId: string, eventId: string, input: UpdateEventInput): Promise<UnifiedEvent> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch["subject"] = input.title;
  if (input.description !== undefined) patch["body"] = { contentType: "text", content: input.description };
  if (input.start !== undefined) patch["start"] = "date" in input.start ? { dateTime: `${input.start.date}T00:00:00`, timeZone: "UTC" } : { dateTime: input.start.dateTime, timeZone: input.start.timeZone };
  if (input.end !== undefined) patch["end"] = "date" in input.end ? { dateTime: `${input.end.date}T00:00:00`, timeZone: "UTC" } : { dateTime: input.end.dateTime, timeZone: input.end.timeZone };
  const e = await graphFetch<GraphEvent>(ctx, `/me/events/${eventId}`, { method: "PATCH", body: JSON.stringify(patch) });
  return mapEvent(e, ctx.calendarAccountId);
}

export async function deleteEvent(ctx: ProviderContext, _calendarId: string, eventId: string): Promise<void> {
  await graphFetch<void>(ctx, `/me/events/${eventId}`, { method: "DELETE" });
}
