import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { watches, calendarAccounts, providerWebhookEvents } from "../db/schema/index.js";
import { timingSafeEqual } from "node:crypto";

export async function providerWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Google push notifications
  app.post("/internal/webhooks/google", async (req, reply) => {
    const channelId = req.headers["x-goog-channel-id"] as string | undefined;
    const token = req.headers["x-goog-channel-token"] as string | undefined;
    const resourceState = req.headers["x-goog-resource-state"] as string | undefined;
    const messageNumber = req.headers["x-goog-message-number"] as string | undefined;

    if (!channelId) return reply.status(400).send();

    // sync notification — acknowledge and do nothing
    if (resourceState === "sync") return reply.status(200).send();

    const [watch] = await db
      .select()
      .from(watches)
      .where(eq(watches.providerChannelId, channelId))
      .limit(1);

    if (!watch) return reply.status(404).send();

    // Verify secret == x-goog-channel-token
    if (!token || !verifySecret(watch.secret, token)) {
      return reply.status(403).send();
    }

    // Dedup
    if (messageNumber) {
      try {
        await db.insert(providerWebhookEvents).values({
          id: uuidv7(),
          provider: "google",
          providerChannelId: channelId,
          messageId: messageNumber,
          payload: (req.body ?? {}) as Record<string, unknown>,
        });
      } catch {
        // unique violation = already processed
        return reply.status(200).send();
      }
    }

    // TODO: enqueue incremental sync job via pg-boss
    app.log.info({ channelId, resourceState }, "google webhook received, sync enqueued");

    return reply.status(200).send();
  });

  // Microsoft Graph change notifications
  app.post<{ Querystring: { validationToken?: string } }>(
    "/internal/webhooks/microsoft",
    async (req, reply) => {
      // MS validation handshake
      if (req.query.validationToken) {
        return reply
          .header("content-type", "text/plain")
          .status(200)
          .send(req.query.validationToken);
      }

      const body = req.body as { value?: Array<{ subscriptionId: string; clientState: string; changeType: string; resource: string }> };

      for (const notification of body.value ?? []) {
        const [watch] = await db
          .select()
          .from(watches)
          .where(eq(watches.providerChannelId, notification.subscriptionId))
          .limit(1);
        if (!watch) continue;

        if (!verifySecret(watch.secret, notification.clientState)) continue;

        try {
          await db.insert(providerWebhookEvents).values({
            id: uuidv7(),
            provider: "microsoft",
            providerChannelId: notification.subscriptionId,
            messageId: `${notification.subscriptionId}:${notification.changeType}:${notification.resource}`,
            payload: notification as unknown as Record<string, unknown>,
          });
        } catch {
          // already processed
        }

        app.log.info({ subscriptionId: notification.subscriptionId }, "microsoft webhook received");
      }

      return reply.status(202).send();
    },
  );
}

function verifySecret(expected: string, actual: string): boolean {
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(actual);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
