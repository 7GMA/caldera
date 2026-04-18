import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./routes/health.js";
import { authUrlRoutes } from "./routes/auth/url.js";
import { authCallbackRoutes } from "./routes/auth/callback.js";
import { appleConnectRoutes } from "./routes/auth/appleConnect.js";
import authPlugin from "./plugins/authPlugin.js";
import { logger } from "./lib/logger.js";

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: false });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Caldera API",
        description:
          "Open-source unified REST API for Google Calendar, Microsoft Outlook & Apple iCloud",
        version: "0.1.0",
        license: { name: "Apache-2.0" },
      },
      servers: [{ url: "/v1" }],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "http",
            scheme: "bearer",
            description: "Caldera API key (cld_live_...)",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { deepLinking: true },
  });

  await app.register(healthRoutes);
  await app.register(authPlugin);

  await app.register(
    async (v1) => {
      v1.get("/", { logLevel: "silent" }, async () => ({
        name: "caldera",
        version: "0.1.0",
        docs: "/docs",
      }));
      await v1.register(authUrlRoutes);
      await v1.register(authCallbackRoutes);
      await v1.register(appleConnectRoutes);
    },
    { prefix: "/v1" },
  );

  await app.ready();
  return app;
}
