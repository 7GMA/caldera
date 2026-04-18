import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import * as googleOAuth from "../../providers/google/oauth.js";
import * as msOAuth from "../../providers/microsoft/oauth.js";
import { encrypt } from "../../crypto/encryption.js";
import { db } from "../../db/client.js";
import { calendarAccounts, endUsers } from "../../db/schema/index.js";

const paramsSchema = z.object({ provider: z.enum(["google", "microsoft"]) });
const querySchema = z.object({ code: z.string(), state: z.string(), error: z.string().optional() });

export async function authCallbackRoutes(app: FastifyInstance) {
  app.get<{
    Params: z.infer<typeof paramsSchema>;
    Querystring: z.infer<typeof querySchema>;
  }>("/auth/:provider/callback", async (req, reply) => {
    const { provider } = paramsSchema.parse(req.params);
    const { code, state, error } = querySchema.parse(req.query);

    if (error) {
      return reply.status(400).send({ error: `OAuth error: ${error}` });
    }

    const stateData =
      provider === "google"
        ? googleOAuth.verifyState(state)
        : msOAuth.verifyState(state);

    if (!stateData) {
      return reply.status(400).send({ error: "Invalid or expired state" });
    }

    const tokens =
      provider === "google"
        ? await googleOAuth.exchangeCode(code)
        : await msOAuth.exchangeCode(code);

    // resolve end user row
    const [userRow] = await db
      .select({ id: endUsers.id })
      .from(endUsers)
      .where(
        and(
          eq(endUsers.applicationId, stateData.applicationId),
          eq(endUsers.externalId, stateData.endUserId),
        ),
      )
      .limit(1);

    if (!userRow) {
      return reply.status(400).send({ error: "End user not found" });
    }

    const accountId = uuidv7();
    await db
      .insert(calendarAccounts)
      .values({
        id: accountId,
        endUserId: userRow.id,
        provider,
        email: tokens.email,
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: encrypt(tokens.refreshToken),
        accessTokenExp: tokens.expiresAt,
        scopes: tokens.scopes,
        status: "active",
      })
      .onConflictDoNothing();

    // redirect to tenant's redirect_uri with account_id
    const redirectUrl = new URL(stateData.redirectUri);
    redirectUrl.searchParams.set("account_id", accountId);
    return reply.redirect(redirectUrl.toString());
  });
}
