import type { FastifyInstance } from "fastify";
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  listDeliveries,
  retryDelivery,
} from "../services/outboundWebhooks.js";

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/webhooks", async (req, reply) => {
    const hooks = await listWebhooks(req.applicationId);
    return reply.send({ webhooks: hooks });
  });

  app.post<{ Body: { url: string; event_types: string[] } }>(
    "/v1/webhooks",
    async (req, reply) => {
      const result = await createWebhook(req.applicationId, req.endUserId, {
        targetUrl: req.body.url,
        eventTypes: req.body.event_types,
      });
      return reply.status(201).send(result);
    },
  );

  app.delete<{ Params: { id: string } }>("/v1/webhooks/:id", async (req, reply) => {
    await deleteWebhook(req.params.id, req.applicationId);
    return reply.status(204).send();
  });

  app.get<{ Params: { id: string } }>(
    "/v1/webhooks/:id/deliveries",
    async (req, reply) => {
      const deliveries = await listDeliveries(req.params.id, req.applicationId);
      return reply.send({ deliveries });
    },
  );

  app.post<{ Params: { id: string; dId: string } }>(
    "/v1/webhooks/:id/deliveries/:dId/retry",
    async (req, reply) => {
      await retryDelivery(req.params.dId, req.applicationId);
      return reply.status(202).send();
    },
  );
}
