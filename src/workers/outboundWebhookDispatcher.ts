import { eq, and, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { webhookDeliveries, outboundWebhooks } from "../db/schema/index.js";
import { logger } from "../lib/logger.js";

const RETRY_DELAYS_MS = [0, 30_000, 120_000, 600_000, 3_600_000, 21_600_000, 86_400_000, 259_200_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

export async function dispatchPendingWebhooks(): Promise<void> {
  const pending = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, "pending"),
        lte(webhookDeliveries.nextAttemptAt, new Date()),
      ),
    );

  for (const delivery of pending) {
    const [hook] = await db
      .select()
      .from(outboundWebhooks)
      .where(eq(outboundWebhooks.id, delivery.outboundWebhookId))
      .limit(1);
    if (!hook || !hook.active) continue;

    const payload = delivery.payload as { body: string };

    try {
      const res = await fetch(hook.targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Caldera-Signature": delivery.signature,
          "X-Caldera-Delivery-Id": delivery.id,
        },
        body: payload.body,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "delivered",
            responseCode: res.status,
            attempts: delivery.attempts + 1,
            deliveredAt: new Date(),
          })
          .where(eq(webhookDeliveries.id, delivery.id));

        await db
          .update(outboundWebhooks)
          .set({ lastSuccessAt: new Date(), failCount: 0 })
          .where(eq(outboundWebhooks.id, hook.id));
      } else {
        await scheduleRetry(delivery, hook.id, res.status);
      }
    } catch (err) {
      logger.warn({ deliveryId: delivery.id, err }, "webhook delivery failed");
      await scheduleRetry(delivery, hook.id, 0);
    }
  }
}

async function scheduleRetry(
  delivery: typeof webhookDeliveries.$inferSelect,
  hookId: string,
  responseCode: number,
): Promise<void> {
  const attempts = delivery.attempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await db
      .update(webhookDeliveries)
      .set({ status: "dead", attempts, responseCode })
      .where(eq(webhookDeliveries.id, delivery.id));

    await db
      .update(outboundWebhooks)
      .set({ failCount: hookId ? 1 : 0 })
      .where(eq(outboundWebhooks.id, hookId));
    return;
  }

  const delayMs = RETRY_DELAYS_MS[attempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
  const nextAttemptAt = new Date(Date.now() + delayMs);

  await db
    .update(webhookDeliveries)
    .set({ status: "failed", attempts, responseCode, nextAttemptAt })
    .where(eq(webhookDeliveries.id, delivery.id));
}
