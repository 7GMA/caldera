import type { Page } from "../lib/pagination.js";

// ─── Unified Event v2 ────────────────────────────────────────────────────────

export interface EventDateTime {
  dateTime: string; // RFC3339
  timeZone: string; // IANA
}

export interface EventDate {
  date: string; // yyyy-MM-dd
}

export interface EventLocation {
  displayName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventRecurrence {
  rrule?: string; // RFC5545 canonical, e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO"
  rdate?: string[];
  exdate?: string[];
  masterEventId?: string;
  isInstance: boolean;
  isException: boolean;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
  optional?: boolean;
  role?: "required" | "optional" | "resource";
}

export interface EventConferencing {
  provider: "google_meet" | "microsoft_teams" | "zoom" | "other";
  joinUrl?: string;
  conferenceId?: string;
  passcode?: string;
  phoneNumbers?: string[];
}

export interface EventAttachment {
  title?: string;
  fileUrl?: string;
  mimeType?: string;
}

export interface EventReminder {
  method: "email" | "popup";
  minutesBefore: number;
}

export interface UnifiedEvent {
  id: string; // caldera-internal stable id
  providerEventId: string;
  providerCalendarId: string;
  calendarAccountId: string;
  iCalUID?: string;

  title: string;
  description?: string;
  descriptionHtml?: string;
  location?: EventLocation;

  start: EventDateTime | EventDate;
  end: EventDateTime | EventDate;
  allDay: boolean;
  timezone: string; // IANA

  recurrence?: EventRecurrence;
  organizer?: { email: string; displayName?: string; self?: boolean };
  attendees?: EventAttendee[];
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "default" | "public" | "private" | "confidential";
  transparency: "opaque" | "transparent";
  reminders?: EventReminder[];
  conferencing?: EventConferencing;
  attachments?: EventAttachment[];

  etag?: string;
  sequence?: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
  raw?: unknown; // only when ?expand=raw
}

// ─── Unified Calendar ────────────────────────────────────────────────────────

export interface UnifiedCalendar {
  id: string;
  providerCalendarId: string;
  calendarAccountId: string;
  name: string;
  color?: string;
  isPrimary: boolean;
  readOnly: boolean;
  timezone?: string;
}

// ─── Free/Busy ───────────────────────────────────────────────────────────────

export interface BusyPeriod {
  start: string;
  end: string;
  status?: "busy" | "tentative" | "outOfOffice";
}

export interface FreeBusy {
  calendarId: string;
  busy: BusyPeriod[];
}

// ─── Push Watches ────────────────────────────────────────────────────────────

export interface Watch {
  id: string;
  providerChannelId: string;
  providerResourceId?: string;
  secret: string;
  expiresAt: Date;
}

export interface SubscribeOptions {
  notificationUrl: string;
}

// ─── Incremental Sync ────────────────────────────────────────────────────────

export type SyncEventType = "created" | "updated" | "deleted";

export interface SyncEvent {
  type: SyncEventType;
  event: UnifiedEvent;
}

export interface SyncResult {
  events: SyncEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Provider Inputs ────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: EventLocation;
  start: EventDateTime | EventDate;
  end: EventDateTime | EventDate;
  allDay?: boolean;
  attendees?: Pick<EventAttendee, "email" | "displayName" | "optional" | "role">[];
  recurrence?: Pick<EventRecurrence, "rrule">;
  visibility?: UnifiedEvent["visibility"];
  transparency?: UnifiedEvent["transparency"];
  reminders?: EventReminder[];
  color?: string;
}

export type UpdateEventInput = Partial<CreateEventInput>;

// ─── List Options ────────────────────────────────────────────────────────────

export interface ListEventsOptions {
  from: string; // ISO8601
  to: string;
  calendarIds?: string[];
  query?: string;
  maxResults?: number;
  pageToken?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
}

// ─── Provider Context ────────────────────────────────────────────────────────

export interface ProviderContext {
  accessToken: string;
  calendarAccountId: string;
  email?: string;
  // for CalDAV providers
  caldavServerUrl?: string;
  encryptedPassword?: string; // decrypt on use
}

// ─── Provider Capabilities ──────────────────────────────────────────────────

export interface ProviderCapabilities {
  nativePush: boolean;
  nativeFreeBusy: boolean;
  nativeIncrementalSync: boolean;
  search: boolean;
  attachments: boolean;
  conferencing: boolean;
}

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface CalendarProvider {
  readonly name: "google" | "microsoft" | "apple" | "caldav_generic";
  readonly capabilities: ProviderCapabilities;

  listCalendars(ctx: ProviderContext): Promise<UnifiedCalendar[]>;
  getCalendar(ctx: ProviderContext, calendarId: string): Promise<UnifiedCalendar>;

  listEvents(ctx: ProviderContext, opts: ListEventsOptions): Promise<Page<UnifiedEvent>>;
  getEvent(
    ctx: ProviderContext,
    calendarId: string,
    eventId: string,
  ): Promise<UnifiedEvent>;
  createEvent(
    ctx: ProviderContext,
    calendarId: string,
    input: CreateEventInput,
  ): Promise<UnifiedEvent>;
  updateEvent(
    ctx: ProviderContext,
    calendarId: string,
    eventId: string,
    input: UpdateEventInput,
  ): Promise<UnifiedEvent>;
  deleteEvent(
    ctx: ProviderContext,
    calendarId: string,
    eventId: string,
    opts?: { notifyAttendees?: boolean },
  ): Promise<void>;
  searchEvents?(
    ctx: ProviderContext,
    query: string,
    opts: ListEventsOptions,
  ): Promise<Page<UnifiedEvent>>;

  freeBusy(
    ctx: ProviderContext,
    calendarIds: string[],
    from: string,
    to: string,
  ): Promise<FreeBusy[]>;

  subscribeWatch?(
    ctx: ProviderContext,
    calendarId: string,
    opts: SubscribeOptions,
  ): Promise<Watch>;
  renewWatch?(ctx: ProviderContext, watch: Watch): Promise<Watch>;
  unsubscribeWatch?(ctx: ProviderContext, watch: Watch): Promise<void>;
  incrementalSync(
    ctx: ProviderContext,
    calendarId: string,
    cursor: string | null,
  ): Promise<SyncResult>;
}
