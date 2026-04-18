import ICAL from "ical.js";
import { v4 as uuidv4 } from "uuid";
import type { UnifiedEvent, CreateEventInput, EventDateTime } from "../types.js";

const IGNORED_CALENDARS = [
  "geburtstag", "birthday", "siri", "holiday", "feiertag", "kontakte",
];

export function shouldSkipCalendar(name: string): boolean {
  return IGNORED_CALENDARS.some((k) => name.toLowerCase().includes(k));
}

export function extractCalendarColor(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw.slice(0, 7);
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const val = r["_text"] ?? r["_cdata"] ?? r["#text"] ?? r["calendarColor"];
    if (typeof val === "string") return val.slice(0, 7);
  }
  return undefined;
}

export function parseICSEvents(icsData: string, calendarAccountId: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  try {
    const jcal = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents("vevent");

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);
        if (event.isRecurring()) {
          const iter = event.iterator();
          let next: ICAL.Time | null;
          let count = 0;
          while ((next = iter.next()) && count < 500) {
            count++;
            const detail = event.getOccurrenceDetails(next);
            events.push(icsEventToUnified(detail.item, calendarAccountId, event.uid));
          }
        } else {
          events.push(icsEventToUnified(event, calendarAccountId, event.uid));
        }
      } catch { /* skip malformed event */ }
    }
  } catch { /* skip malformed ICS */ }
  return events;
}

function icsEventToUnified(event: ICAL.Event, calendarAccountId: string, uid: string): UnifiedEvent {
  const dtstart = event.startDate;
  const dtend = event.endDate ?? dtstart;
  const allDay = dtstart.isDate;

  const tz = (dtstart as unknown as { timezone?: string }).timezone;
  const startTz = tz ?? "UTC";
  const endTz = (dtend as unknown as { timezone?: string }).timezone ?? "UTC";

  const start = allDay
    ? { date: dtstart.toString().slice(0, 10) }
    : { dateTime: dtstart.toJSDate().toISOString(), timeZone: startTz };
  const end = allDay
    ? { date: dtend.toString().slice(0, 10) }
    : { dateTime: dtend.toJSDate().toISOString(), timeZone: endTz };

  const rruleVal = event.component.getFirstPropertyValue("rrule");
  const rruleStr = rruleVal != null ? String(rruleVal) : undefined;

  const createdVal = event.component.getFirstPropertyValue("created");
  const lastModVal = event.component.getFirstPropertyValue("last-modified");

  const base: UnifiedEvent = {
    id: uid || uuidv4(),
    providerEventId: uid || uuidv4(),
    providerCalendarId: "",
    calendarAccountId,
    iCalUID: uid,
    title: event.summary ?? "(no title)",
    start,
    end,
    allDay,
    timezone: allDay ? "UTC" : startTz,
    status: "confirmed",
    visibility: "default",
    transparency: "opaque",
    createdAt: createdVal != null ? String(createdVal) : new Date().toISOString(),
    updatedAt: lastModVal != null ? String(lastModVal) : new Date().toISOString(),
  };

  if (event.description) base.description = event.description;
  if (event.location) base.location = { displayName: event.location };
  if (rruleStr) base.recurrence = { rrule: rruleStr, isInstance: false, isException: false };
  if (event.organizer) {
    base.organizer = { email: String(event.organizer).replace("mailto:", "") };
  }

  return base;
}

export function makeICS(uid: string, input: CreateEventInput): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dtstart = "date" in input.start
    ? `DTSTART;VALUE=DATE:${input.start.date.replace(/-/g, "")}`
    : `DTSTART;TZID=${input.start.timeZone}:${input.start.dateTime.replace(/[-:]/g, "").replace("Z", "")}`;
  const dtend = "date" in input.end
    ? `DTEND;VALUE=DATE:${input.end.date.replace(/-/g, "")}`
    : `DTEND;TZID=${input.end.timeZone}:${input.end.dateTime.replace(/[-:]/g, "").replace("Z", "")}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Caldera//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtstart,
    dtend,
    `SUMMARY:${input.title}`,
    input.description ? `DESCRIPTION:${input.description.replace(/\n/g, "\\n")}` : null,
    input.location?.displayName ? `LOCATION:${input.location.displayName}` : null,
    input.recurrence?.rrule ? `RRULE:${input.recurrence.rrule}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  return lines;
}
