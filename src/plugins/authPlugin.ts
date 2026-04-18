import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { verifyApiKey, resolveEndUser } from "../services/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    applicationId: string;
    endUserId: string;
    apiKeyId: string;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("applicationId", "");
  app.decorateRequest("endUserId", "");
  app.decorateRequest("apiKeyId", "");

  app.addHook("onRequest", async (req: FastifyRequest, reply) => {
    // skip auth for health + docs + provider webhooks
    const skip = ["/healthz", "/readyz", "/metrics", "/docs", "/openapi.json", "/v1"];
    if (skip.some((p) => req.url === p || req.url.startsWith("/docs") || req.url.startsWith("/internal/"))) {
      return;
    }

    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing Authorization header" });
    }
    const token = auth.slice(7);
    const result = await verifyApiKey(token);
    if (!result) {
      return reply.status(401).send({ error: "Invalid or revoked API key" });
    }

    const externalId = req.headers["x-end-user-id"] as string | undefined;
    if (!externalId) {
      return reply.status(400).send({ error: "Missing X-End-User-Id header" });
    }

    const endUserId = await resolveEndUser(result.applicationId, externalId);
    req.applicationId = result.applicationId;
    req.apiKeyId = result.keyId;
    req.endUserId = endUserId;
  });
}

export default fp(authPlugin);
