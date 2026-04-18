import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { DAVClient } from "tsdav";
import { db } from "../../db/client.js";
import { calendarAccounts } from "../../db/schema/index.js";
import { encrypt } from "../../crypto/encryption.js";

const bodySchema = z.object({
  email: z.string().email(),
  appSpecificPassword: z.string().min(1),
});

export async function appleConnectRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof bodySchema> }>(
    "/auth/apple/connect",
    {
      schema: {
        tags: ["Auth"],
        summary: "Connect an Apple iCloud calendar via app-specific password",
        body: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            appSpecificPassword: { type: "string" },
          },
          required: ["email", "appSpecificPassword"],
        },
      },
    },
    async (req, reply) => {
      const { email, appSpecificPassword } = bodySchema.parse(req.body);

      // validate credentials by doing a real CalDAV login
      const client = new DAVClient({
        serverUrl: "https://caldav.icloud.com",
        credentials: { username: email, password: appSpecificPassword },
        authMethod: "Basic",
        defaultAccountType: "caldav",
      });
      try {
        await client.login();
        await client.fetchCalendars();
      } catch {
        return reply.status(401).send({ error: "Invalid Apple credentials" });
      }

      const accountId = uuidv7();
      await db
        .insert(calendarAccounts)
        .values({
          id: accountId,
          endUserId: req.endUserId,
          provider: "apple",
          email,
          // store password encrypted; access_token_enc holds encrypted password for CalDAV
          accessTokenEnc: encrypt(appSpecificPassword),
          caldavServerUrl: "https://caldav.icloud.com",
          scopes: ["caldav"],
          status: "active",
        })
        .onConflictDoNothing();

      return reply.send({ account_id: accountId });
    },
  );
}
