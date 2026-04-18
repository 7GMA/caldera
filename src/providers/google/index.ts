import type { CalendarProvider, ProviderCapabilities, ProviderContext, UnifiedCalendar, UnifiedEvent, CreateEventInput, UpdateEventInput, ListEventsOptions, FreeBusy, Watch, SubscribeOptions, SyncResult } from "../types.js";
import type { Page } from "../../lib/pagination.js";
import { listCalendars, getCalendar } from "./calendars.js";
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent } from "./events.js";
import { freeBusy } from "./freeBusy.js";
import { incrementalSync } from "./sync.js";
import { subscribeWatch, unsubscribeWatch } from "./watch.js";

export { getCalendar } from "./calendars.js";

const capabilities: ProviderCapabilities = {
  nativePush: true,
  nativeFreeBusy: true,
  nativeIncrementalSync: true,
  search: true,
  attachments: false,
  conferencing: true,
};

export const googleProvider: CalendarProvider = {
  name: "google",
  capabilities,
  listCalendars: (ctx: ProviderContext) => listCalendars(ctx),
  getCalendar: (ctx: ProviderContext, id: string) => getCalendar(ctx, id),
  listEvents: (ctx: ProviderContext, opts: ListEventsOptions) => listEvents(ctx, opts),
  getEvent: (ctx: ProviderContext, calId: string, evtId: string) => getEvent(ctx, calId, evtId),
  createEvent: (ctx: ProviderContext, calId: string, input: CreateEventInput) => createEvent(ctx, calId, input),
  updateEvent: (ctx: ProviderContext, calId: string, evtId: string, input: UpdateEventInput) => updateEvent(ctx, calId, evtId, input),
  deleteEvent: (ctx: ProviderContext, calId: string, evtId: string) => deleteEvent(ctx, calId, evtId),
  freeBusy: (ctx: ProviderContext, calIds: string[], from: string, to: string) => freeBusy(ctx, calIds, from, to),
  subscribeWatch: (ctx: ProviderContext, calId: string, opts: SubscribeOptions) => subscribeWatch(ctx, calId, opts),
  unsubscribeWatch: (ctx: ProviderContext, watch: Watch) => unsubscribeWatch(ctx, watch),
  incrementalSync: (ctx: ProviderContext, calId: string, cursor: string | null) => incrementalSync(ctx, calId, cursor),
};
