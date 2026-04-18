import type { FastifyInstance } from "fastify";
import { incrementalSync } from "../services/sync.js";

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      account_id: string;
      calendar_id: string;
      cursor?: string;
    };
  }>("/v1/sync", async (req, reply) => {
    const { account_id, calendar_id, cursor } = req.query;
    const result = await incrementalSync(account_id, calendar_id, req.endUserId, cursor ?? null);
    return reply.send(result);
  });
}
