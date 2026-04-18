import type { FastifyInstance } from "fastify";
import { listCalendars, getCalendar } from "../services/calendars.js";

export async function calendarsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { account_id: string } }>("/v1/calendars", async (req, reply) => {
    const cals = await listCalendars(req.query.account_id, req.endUserId);
    return reply.send({ calendars: cals });
  });

  app.get<{ Params: { id: string }; Querystring: { account_id: string } }>(
    "/v1/calendars/:id",
    async (req, reply) => {
      const cal = await getCalendar(req.query.account_id, req.params.id, req.endUserId);
      return reply.send(cal);
    },
  );
}
