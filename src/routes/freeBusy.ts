import type { FastifyInstance } from "fastify";
import { getFreeBusy } from "../services/freeBusy.js";

export async function freeBusyRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: {
      from: string;
      to: string;
      calendars: Array<{ account_id: string; calendar_id: string }>;
    };
  }>("/v1/free-busy", async (req, reply) => {
    const result = await getFreeBusy(req.endUserId, {
      from: req.body.from,
      to: req.body.to,
      calendars: req.body.calendars.map((c) => ({
        accountId: c.account_id,
        calendarId: c.calendar_id,
      })),
    });
    return reply.send({ periods: result });
  });
}
