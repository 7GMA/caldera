import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  logger.error(err, "Server failed to start");
  process.exit(1);
}
