import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 1000;

async function pgRateLimit(key: string, windowMs: number, max: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);
  const result = await db.execute(
    sql`
      INSERT INTO rate_limit_buckets (key, window_start, count)
      VALUES (${key}, ${windowStart.toISOString()}, 1)
      ON CONFLICT (key) DO UPDATE
        SET count = CASE
          WHEN rate_limit_buckets.window_start < ${windowStart.toISOString()}
          THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        window_start = CASE
          WHEN rate_limit_buckets.window_start < ${windowStart.toISOString()}
          THEN ${windowStart.toISOString()}
          ELSE rate_limit_buckets.window_start
        END
      RETURNING count
    `,
  );
  const count = (result.rows[0] as { count: number } | undefined)?.count ?? 0;
  return count <= max;
}

async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith("/healthz") || req.url.startsWith("/readyz") || req.url.startsWith("/metrics")) {
      return;
    }
    const key = req.headers["authorization"] ?? req.ip;
    try {
      const allowed = await pgRateLimit(String(key), DEFAULT_WINDOW_MS, DEFAULT_MAX);
      if (!allowed) {
        return reply.status(429).send({ error: "rate_limit_exceeded", message: "Too many requests" });
      }
    } catch {
      // Don't block on rate limit errors
    }
  });
}

export default fp(rateLimitPlugin, { name: "rate-limit" });
