import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as googleOAuth from "../../providers/google/oauth.js";
import * as msOAuth from "../../providers/microsoft/oauth.js";

const paramsSchema = z.object({ provider: z.enum(["google", "microsoft"]) });
const querySchema = z.object({
  end_user_id: z.string().min(1),
  redirect_uri: z.string().url(),
});

export async function authUrlRoutes(app: FastifyInstance) {
  app.get<{
    Params: z.infer<typeof paramsSchema>;
    Querystring: z.infer<typeof querySchema>;
  }>(
    "/auth/:provider/url",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get OAuth authorization URL for a provider",
        params: { type: "object", properties: { provider: { type: "string", enum: ["google", "microsoft"] } }, required: ["provider"] },
        querystring: { type: "object", properties: { end_user_id: { type: "string" }, redirect_uri: { type: "string" } }, required: ["end_user_id", "redirect_uri"] },
      },
    },
    async (req, reply) => {
      const params = paramsSchema.parse(req.params);
      const query = querySchema.parse(req.query);

      // auth plugin skips /v1 root, so manually check here
      if (!req.applicationId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      let url: string;
      if (params.provider === "google") {
        url = googleOAuth.buildAuthUrl({
          applicationId: req.applicationId,
          endUserId: query.end_user_id,
          redirectUri: query.redirect_uri,
        });
      } else {
        url = msOAuth.buildAuthUrl({
          applicationId: req.applicationId,
          endUserId: query.end_user_id,
          redirectUri: query.redirect_uri,
        });
      }

      return reply.send({ url, provider: params.provider });
    },
  );
}
