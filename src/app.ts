import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./routes/health.js";
import { authUrlRoutes } from "./routes/auth/url.js";
import { authCallbackRoutes } from "./routes/auth/callback.js";
import { appleConnectRoutes } from "./routes/auth/appleConnect.js";
import { accountsRoutes } from "./routes/accounts.js";
import { calendarsRoutes } from "./routes/calendars.js";
import { eventsRoutes } from "./routes/events.js";
import { freeBusyRoutes } from "./routes/freeBusy.js";
import { syncRoutes } from "./routes/sync.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { availabilityRoutes } from "./routes/availability.js";
import { providerWebhookRoutes } from "./routes/providerWebhook.js";
import authPlugin from "./plugins/authPlugin.js";
import idempotencyPlugin from "./plugins/idempotencyPlugin.js";
import { registerErrorHandler } from "./plugins/errorHandler.js";
import { logger } from "./lib/logger.js";
import { registerProvider } from "./providers/registry.js";
import { googleProvider } from "./providers/google/index.js";
import { microsoftProvider } from "./providers/microsoft/index.js";
import { appleProvider, caldavGenericProvider } from "./providers/caldav/index.js";

// Register all providers at startup
registerProvider(googleProvider);
registerProvider(microsoftProvider);
registerProvider(appleProvider);
registerProvider(caldavGenericProvider);

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
        version: "1.0.0",
        license: { name: "Apache-2.0" },
      },
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

  // Internal provider webhooks (no auth required)
  await app.register(providerWebhookRoutes);

  // Health (no auth)
  await app.register(healthRoutes);

  // Auth plugin + idempotency for authenticated routes
  await app.register(authPlugin);
  await app.register(idempotencyPlugin);

  // Error handler
  registerErrorHandler(app as unknown as Parameters<typeof registerErrorHandler>[0]);

  // Auth routes (partially public — URL generation needs API key)
  await app.register(authUrlRoutes);
  await app.register(authCallbackRoutes);
  await app.register(appleConnectRoutes);

  // API routes
  await app.register(accountsRoutes);
  await app.register(calendarsRoutes);
  await app.register(eventsRoutes);
  await app.register(freeBusyRoutes);
  await app.register(syncRoutes);
  await app.register(webhooksRoutes);
  await app.register(availabilityRoutes);

  await app.ready();
  return app;
}
