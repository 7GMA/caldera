import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client.js";
import { calendarAccounts } from "../db/schema/index.js";
import { decrypt, encrypt } from "../crypto/encryption.js";
import { getProvider } from "../providers/registry.js";
import type { ProviderContext } from "../providers/types.js";

export interface AccountRow {
  id: string;
  provider: string;
  email: string | null;
  displayName: string | null;
  status: string;
  caldavServerUrl: string | null;
  createdAt: Date;
}

export async function listAccounts(
  endUserId: string,
): Promise<AccountRow[]> {
  return db
    .select({
      id: calendarAccounts.id,
      provider: calendarAccounts.provider,
      email: calendarAccounts.email,
      displayName: calendarAccounts.displayName,
      status: calendarAccounts.status,
      caldavServerUrl: calendarAccounts.caldavServerUrl,
      createdAt: calendarAccounts.createdAt,
    })
    .from(calendarAccounts)
    .where(eq(calendarAccounts.endUserId, endUserId));
}

export async function getAccount(id: string, endUserId: string): Promise<AccountRow> {
  const [row] = await db
    .select({
      id: calendarAccounts.id,
      provider: calendarAccounts.provider,
      email: calendarAccounts.email,
      displayName: calendarAccounts.displayName,
      status: calendarAccounts.status,
      caldavServerUrl: calendarAccounts.caldavServerUrl,
      createdAt: calendarAccounts.createdAt,
    })
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, id), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!row) throw Object.assign(new Error("Account not found"), { statusCode: 404 });
  return row;
}

export async function deleteAccount(id: string, endUserId: string): Promise<void> {
  await getAccount(id, endUserId);
  await db.delete(calendarAccounts).where(eq(calendarAccounts.id, id));
}

export async function buildProviderContext(
  accountId: string,
  endUserId: string,
): Promise<ProviderContext> {
  const [row] = await db
    .select()
    .from(calendarAccounts)
    .where(and(eq(calendarAccounts.id, accountId), eq(calendarAccounts.endUserId, endUserId)))
    .limit(1);
  if (!row) throw Object.assign(new Error("Account not found"), { statusCode: 404 });

  const accessToken = row.accessTokenEnc ? decrypt(row.accessTokenEnc) : "";

  return {
    accessToken,
    calendarAccountId: row.id,
    email: row.email ?? undefined,
    caldavServerUrl: row.caldavServerUrl ?? undefined,
    encryptedPassword: row.accessTokenEnc ?? undefined,
  };
}

export async function createCalDAVAccount(
  endUserId: string,
  data: {
    email: string;
    encryptedPassword: string;
    caldavServerUrl?: string;
    provider?: "apple" | "caldav_generic";
  },
): Promise<string> {
  const id = uuidv7();
  await db.insert(calendarAccounts).values({
    id,
    endUserId,
    provider: data.provider ?? "apple",
    email: data.email,
    accessTokenEnc: data.encryptedPassword,
    caldavServerUrl: data.caldavServerUrl ?? "https://caldav.icloud.com",
    status: "active",
  });
  return id;
}

export async function updateAccountTokens(
  accountId: string,
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  },
): Promise<void> {
  await db
    .update(calendarAccounts)
    .set({
      accessTokenEnc: encrypt(data.accessToken),
      ...(data.refreshToken ? { refreshTokenEnc: encrypt(data.refreshToken) } : {}),
      ...(data.expiresAt ? { accessTokenExp: data.expiresAt } : {}),
      status: "active",
      refreshFailCount: 0,
      lastRefreshAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(calendarAccounts.id, accountId));
}
