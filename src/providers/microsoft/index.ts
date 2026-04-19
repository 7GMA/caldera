import type { CalendarProvider, ProviderCapabilities } from "../types.js";
import { listCalendars, getCalendar } from "./calendars.js";
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent } from "./events.js";
import { freeBusy } from "./freeBusy.js";
import { incrementalSync } from "./sync.js";
import { subscribeWatch, renewWatch, unsubscribeWatch } from "./subscription.js";

const capabilities: ProviderCapabilities = {
  nativePush: true,
  nativeFreeBusy: true,
  nativeIncrementalSync: true,
  search: true,
  attachments: false,
  conferencing: true,
};

export const microsoftProvider: CalendarProvider = {
  name: "microsoft",
  capabilities,
  listCalendars: (ctx) => listCalendars(ctx),
  getCalendar: (ctx, id) => getCalendar(ctx, id),
  listEvents: (ctx, opts) => listEvents(ctx, opts),
  getEvent: (ctx, calId, evtId) => getEvent(ctx, calId, evtId),
  createEvent: (ctx, calId, input) => createEvent(ctx, calId, input),
  updateEvent: (ctx, calId, evtId, input) => updateEvent(ctx, calId, evtId, input),
  deleteEvent: (ctx, calId, evtId) => deleteEvent(ctx, calId, evtId),
  freeBusy: (ctx, calIds, from, to) => freeBusy(ctx, calIds, from, to),
  subscribeWatch: (ctx, calId, opts) => subscribeWatch(ctx, calId, opts),
  renewWatch: (ctx, watch) => renewWatch(ctx, watch),
  unsubscribeWatch: (ctx, watch) => unsubscribeWatch(ctx, watch),
  incrementalSync: (ctx, calId, cursor) => incrementalSync(ctx, calId, cursor),
};
