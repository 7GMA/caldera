import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { calendarAccounts } from "../db/schema/index.js";
import { getProvider } from "../providers/registry.js";
import { buildProviderContext } from "./accounts.js";
import type { UnifiedEvent, CreateEventInput, UpdateEventInput, ListEventsOptions } from "../providers/types.js";
import type { Page } from "../lib/pagination.js";

async function resolveProvider(accountId: string, endUserId: string) {
  const [account] = await db
    .select({ provider: calendarAccounts.provider })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!account) throw Object.assign(new Error("Account not found"), { statusCode: 404 });
  const ctx = await buildProviderContext(accountId, endUserId);
  return { ctx, provider: getProvider(account.provider) };
}

export async function listEvents(
  accountId: string,
  endUserId: string,
  opts: ListEventsOptions,
): Promise<Page<UnifiedEvent>> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  return provider.listEvents(ctx, opts);
}

export async function getEvent(
  accountId: string,
  endUserId: string,
  calendarId: string,
  eventId: string,
): Promise<UnifiedEvent> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  return provider.getEvent(ctx, calendarId, eventId);
}

export async function createEvent(
  accountId: string,
  endUserId: string,
  calendarId: string,
  input: CreateEventInput,
): Promise<UnifiedEvent> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  return provider.createEvent(ctx, calendarId, input);
}

export async function updateEvent(
  accountId: string,
  endUserId: string,
  calendarId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<UnifiedEvent> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  return provider.updateEvent(ctx, calendarId, eventId, input);
}

export async function deleteEvent(
  accountId: string,
  endUserId: string,
  calendarId: string,
  eventId: string,
  opts?: { notifyAttendees?: boolean },
): Promise<void> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  return provider.deleteEvent(ctx, calendarId, eventId, opts);
}

export async function searchEvents(
  accountId: string,
  endUserId: string,
  query: string,
  opts: ListEventsOptions,
): Promise<Page<UnifiedEvent>> {
  const { ctx, provider } = await resolveProvider(accountId, endUserId);
  if (provider.searchEvents) return provider.searchEvents(ctx, query, opts);
  return provider.listEvents(ctx, { ...opts, query });
}
