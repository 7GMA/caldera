import type { FastifyInstance } from "fastify";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
} from "../services/events.js";

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      account_id: string;
      calendar_id?: string;
      from: string;
      to: string;
      q?: string;
      page_token?: string;
      max_results?: number;
    };
  }>("/v1/events", async (req, reply) => {
    const { account_id, calendar_id, from, to, q, page_token, max_results } = req.query;
    if (q) {
      const res = await searchEvents(account_id, req.endUserId, q, {
        from,
        to,
        calendarIds: calendar_id ? [calendar_id] : undefined,
        pageToken: page_token,
        maxResults: max_results,
      });
      return reply.send(res);
    }
    const res = await listEvents(account_id, req.endUserId, {
      from,
      to,
      calendarIds: calendar_id ? [calendar_id] : undefined,
      pageToken: page_token,
      maxResults: max_results,
    });
    return reply.send(res);
  });

  app.get<{ Params: { id: string }; Querystring: { account_id: string; calendar_id: string } }>(
    "/v1/events/:id",
    async (req, reply) => {
      const ev = await getEvent(req.query.account_id, req.endUserId, req.query.calendar_id, req.params.id);
      return reply.send(ev);
    },
  );

  app.post<{ Body: { account_id: string; calendar_id: string; [key: string]: unknown } }>(
    "/v1/events",
    async (req, reply) => {
      const { account_id, calendar_id, ...input } = req.body;
      const ev = await createEvent(account_id, req.endUserId, calendar_id, input as never);
      return reply.status(201).send(ev);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { account_id: string; calendar_id: string; [key: string]: unknown };
  }>("/v1/events/:id", async (req, reply) => {
    const { account_id, calendar_id, ...input } = req.body;
    const ev = await updateEvent(account_id, req.endUserId, calendar_id, req.params.id, input as never);
    return reply.send(ev);
  });

  app.delete<{
    Params: { id: string };
    Querystring: { account_id: string; calendar_id: string; notify_attendees?: boolean };
  }>("/v1/events/:id", async (req, reply) => {
    const { account_id, calendar_id, notify_attendees } = req.query;
    await deleteEvent(account_id, req.endUserId, calendar_id, req.params.id, {
      notifyAttendees: notify_attendees,
    });
    return reply.status(204).send();
  });
}
