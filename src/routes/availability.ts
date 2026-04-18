import type { FastifyInstance } from "fastify";

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/availability", async (_req, reply) => {
    return reply.status(501).send({ error: "not_implemented", message: "Availability is planned for Phase 2" });
  });
}
