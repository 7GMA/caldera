import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/client.js";
import { idempotencyKeys } from "../db/schema/index.js";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function idempotencyPlugin(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!MUTATION_METHODS.has(req.method)) return;
    const idKey = req.headers["idempotency-key"] as string | undefined;
    if (!idKey || !req.applicationId) return;

    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, idKey))
      .limit(1);

    if (existing) {
      const body = existing.responseBody ? JSON.parse(existing.responseBody) : {};
      return reply.status(existing.responseStatus ?? 200).send(body);
    }

    req.idempotencyKey = idKey;
  });

  app.addHook("onSend", async (req: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const idKey = req.idempotencyKey;
    if (!idKey || !req.applicationId) return payload;

    const status = reply.statusCode;
    const bodyStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const hash = createHash("sha256").update(bodyStr).digest("hex");

    await db
      .insert(idempotencyKeys)
      .values({
        key: idKey,
        applicationId: req.applicationId,
        requestHash: hash,
        responseStatus: status,
        responseBody: bodyStr,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();

    return payload;
  });
}

export default fp(idempotencyPlugin, { name: "idempotency" });

declare module "fastify" {
  interface FastifyRequest {
    idempotencyKey?: string;
  }
}
