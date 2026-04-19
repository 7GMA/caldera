import { lt, and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { calendarAccounts } from "../db/schema/index.js";
import { encrypt } from "../crypto/encryption.js";
import { refreshAccessToken as googleRefresh } from "../providers/google/oauth.js";
import { refreshAccessToken as msRefresh } from "../providers/microsoft/oauth.js";
import { logger } from "../lib/logger.js";

const REFRESH_WINDOW_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const MAX_FAIL_COUNT = 5;

export async function runTokenRefresh(): Promise<void> {
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS);

  const accounts = await db
    .select({
      id: calendarAccounts.id,
      provider: calendarAccounts.provider,
      refreshTokenEnc: calendarAccounts.refreshTokenEnc,
      refreshFailCount: calendarAccounts.refreshFailCount,
    })
    .from(calendarAccounts)
    .where(
      and(
        eq(calendarAccounts.status, "active"),
        lt(calendarAccounts.accessTokenExp, cutoff),
        sql`${calendarAccounts.provider} IN ('google', 'microsoft')`,
      ),
    )
    .limit(100);

  for (const account of accounts) {
    if (!account.refreshTokenEnc) continue;
    try {
      let result: { accessToken: string; expiresAt: Date; newRefreshToken?: string };
      if (account.provider === "google") {
        const r = await googleRefresh(account.refreshTokenEnc);
        result = { accessToken: r.accessToken, expiresAt: r.expiresAt, ...(r.newRefreshToken ? { newRefreshToken: r.newRefreshToken } : {}) };
      } else {
        const r = await msRefresh(account.refreshTokenEnc);
        result = { accessToken: r.accessToken, expiresAt: r.expiresAt };
      }

      await db.update(calendarAccounts).set({
        accessTokenEnc: encrypt(result.accessToken),
        accessTokenExp: result.expiresAt,
        ...(result.newRefreshToken ? { refreshTokenEnc: encrypt(result.newRefreshToken) } : {}),
        refreshFailCount: 0,
        lastRefreshAt: new Date(),
        status: "active",
      }).where(eq(calendarAccounts.id, account.id));

      logger.debug({ accountId: account.id, provider: account.provider }, "token refreshed");
    } catch (err) {
      const newCount = (account.refreshFailCount ?? 0) + 1;
      const newStatus = newCount >= MAX_FAIL_COUNT ? "refresh_failed" : "active";
      await db.update(calendarAccounts).set({
        refreshFailCount: newCount,
        status: newStatus,
      }).where(eq(calendarAccounts.id, account.id));
      logger.warn({ accountId: account.id, provider: account.provider, failCount: newCount, err }, "token refresh failed");
    }
  }
}
