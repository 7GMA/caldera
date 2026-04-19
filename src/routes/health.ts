import type { FastifyInstance } from "fastify";
import { pool } from "../db/client.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", { logLevel: "silent" }, async (_req, reply) => {
    return reply.send({ status: "ok" });
  });

  app.get("/readyz", { logLevel: "silent" }, async (_req, reply) => {
    try {
      await pool.query("SELECT 1");
      return reply.send({ status: "ok", db: "connected" });
    } catch {
      return reply.status(503).send({ status: "error", db: "unavailable" });
    }
  });
}
