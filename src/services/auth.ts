import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { apiKeys, applications, endUsers } from "../db/schema/index.js";

const KEY_PREFIX = "cld_live_";

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const secret = randomBytes(32).toString("base64url");
  const plaintext = KEY_PREFIX + secret;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash, prefix: KEY_PREFIX };
}

export async function verifyApiKey(
  plaintext: string,
): Promise<{ applicationId: string; keyId: string } | null> {
  const hash = createHash("sha256").update(plaintext).digest("hex");
  const [row] = await db
    .select({ id: apiKeys.id, applicationId: apiKeys.applicationId, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);
  if (!row || row.revokedAt) return null;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));
  return { applicationId: row.applicationId, keyId: row.id };
}

export async function resolveEndUser(
  applicationId: string,
  externalId: string,
): Promise<string> {
  const [existing] = await db
    .select({ id: endUsers.id })
    .from(endUsers)
    .where(eq(endUsers.applicationId, applicationId))
    .limit(1);
  if (existing) return existing.id;
  const id = uuidv7();
  await db.insert(endUsers).values({ id, applicationId, externalId }).onConflictDoNothing();
  const [row] = await db
    .select({ id: endUsers.id })
    .from(endUsers)
    .where(eq(endUsers.applicationId, applicationId))
    .limit(1);
  return row!.id;
}

export async function createApplication(
  name: string,
  ownerEmail: string,
): Promise<{ applicationId: string; apiKeyPlaintext: string }> {
  const applicationId = uuidv7();
  const webhookSecret = randomBytes(32).toString("hex");
  await db.insert(applications).values({
    id: applicationId,
    name,
    ownerEmail,
    webhookSecret,
  });
  const { plaintext, hash, prefix } = generateApiKey();
  await db.insert(apiKeys).values({
    id: uuidv7(),
    applicationId,
    name: "default",
    keyPrefix: prefix,
    keyHash: hash,
    scopes: ["events:read", "events:write", "calendars:read", "webhooks:write"],
  });
  return { applicationId, apiKeyPlaintext: plaintext };
}
