import { eq, and } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { outboundWebhooks, webhookDeliveries } from "../db/schema/index.js";
import { sign } from "../crypto/hmac.js";

export interface WebhookInput {
  targetUrl: string;
  eventTypes: string[];
}

export async function listWebhooks(applicationId: string, _endUserId?: string) {
  return db
    .select()
    .from(outboundWebhooks)
    .where(eq(outboundWebhooks.applicationId, applicationId));
}

export async function createWebhook(
  applicationId: string,
  endUserId: string | null,
  input: WebhookInput,
) {
  const id = uuidv7();
  const secret = randomBytes(32).toString("hex");
  await db.insert(outboundWebhooks).values({
    id,
    applicationId,
    endUserId,
    targetUrl: input.targetUrl,
    eventTypes: input.eventTypes,
    secret,
  });
  return { id, secret };
}

export async function deleteWebhook(id: string, applicationId: string): Promise<void> {
  await db
    .delete(outboundWebhooks)
    .where(and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.applicationId, applicationId)));
}

export async function enqueueDelivery(
  applicationId: string,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const hooks = await db
    .select()
    .from(outboundWebhooks)
    .where(
      and(eq(outboundWebhooks.applicationId, applicationId), eq(outboundWebhooks.active, true)),
    );

  for (const hook of hooks) {
    if (!hook.eventTypes.includes(eventType) && !hook.eventTypes.includes("*")) continue;

    const body = JSON.stringify({ id: uuidv7(), type: eventType, data: payload });
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = sign(hook.secret, `${ts}.${body}`);
    const signature = `t=${ts},v1=${sig}`;

    await db.insert(webhookDeliveries).values({
      id: uuidv7(),
      outboundWebhookId: hook.id,
      payload: { eventType, body } as unknown as Record<string, unknown>,
      signature,
      status: "pending",
      nextAttemptAt: new Date(),
    });
  }
}

export async function listDeliveries(webhookId: string, applicationId: string) {
  const [hook] = await db
    .select({ id: outboundWebhooks.id })
    .from(outboundWebhooks)
    .where(and(eq(outboundWebhooks.id, webhookId), eq(outboundWebhooks.applicationId, applicationId)))
    .limit(1);
  if (!hook) throw Object.assign(new Error("Webhook not found"), { statusCode: 404 });
  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.outboundWebhookId, webhookId));
}

export async function retryDelivery(deliveryId: string, _applicationId: string): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({ status: "pending", nextAttemptAt: new Date(), attempts: 0 })
    .where(eq(webhookDeliveries.id, deliveryId));
}
