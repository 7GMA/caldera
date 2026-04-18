import type { CalendarProvider, ProviderCapabilities, ProviderContext, UnifiedCalendar, UnifiedEvent, CreateEventInput, UpdateEventInput, ListEventsOptions, FreeBusy, SyncResult } from "../types.js";
import type { Page } from "../../lib/pagination.js";
import { listCalendars, getCalendar } from "./calendars.js";
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent } from "./events.js";
import { freeBusy } from "./freeBusy.js";
import { incrementalSync } from "./sync.js";

const capabilities: ProviderCapabilities = {
  nativePush: false,
  nativeFreeBusy: false,
  nativeIncrementalSync: true,
  search: false,
  attachments: false,
  conferencing: false,
};

export const appleProvider: CalendarProvider = {
  name: "apple",
  capabilities,
  listCalendars: (ctx) => listCalendars(ctx),
  getCalendar: (ctx, id) => getCalendar(ctx, id),
  listEvents: (ctx, opts) => listEvents(ctx, opts),
  getEvent: (ctx, calId, evtId) => getEvent(ctx, calId, evtId),
  createEvent: (ctx, calId, input) => createEvent(ctx, calId, input),
  updateEvent: (ctx, calId, evtId, input) => updateEvent(ctx, calId, evtId, input),
  deleteEvent: (ctx, calId, evtId) => deleteEvent(ctx, calId, evtId),
  freeBusy: (ctx, calIds, from, to) => freeBusy(ctx, calIds, from, to),
  incrementalSync: (ctx, calId, cursor) => incrementalSync(ctx, calId, cursor),
};

export const caldavGenericProvider: CalendarProvider = {
  ...appleProvider,
  name: "caldav_generic",
};
