import type { ProviderContext, UnifiedCalendar } from "../types.js";
import { graphFetch } from "./graphFetch.js";

interface GraphCalendar {
  id: string;
  name?: string;
  hexColor?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: { address?: string };
}

export async function listCalendars(ctx: ProviderContext): Promise<UnifiedCalendar[]> {
  const res = await graphFetch<{ value: GraphCalendar[] }>(ctx, "/me/calendars?$select=id,name,hexColor,isDefaultCalendar,canEdit");
  return (res.value ?? []).map((c) => ({
    id: c.id,
    providerCalendarId: c.id,
    calendarAccountId: ctx.calendarAccountId,
    name: c.name ?? "",
    color: c.hexColor ?? undefined,
    isPrimary: c.isDefaultCalendar === true,
    readOnly: c.canEdit === false,
  }));
}

export async function getCalendar(ctx: ProviderContext, calendarId: string): Promise<UnifiedCalendar> {
  const c = await graphFetch<GraphCalendar>(ctx, `/me/calendars/${calendarId}?$select=id,name,hexColor,isDefaultCalendar,canEdit`);
  return {
    id: c.id,
    providerCalendarId: c.id,
    calendarAccountId: ctx.calendarAccountId,
    name: c.name ?? "",
    color: c.hexColor ?? undefined,
    isPrimary: c.isDefaultCalendar === true,
    readOnly: c.canEdit === false,
  };
}
