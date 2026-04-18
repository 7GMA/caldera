import PgBoss from "pg-boss";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { runTokenRefresh } from "./tokenRefresh.js";

const boss = new PgBoss(env.DATABASE_URL);

boss.on("error", (err) => logger.error(err, "pg-boss error"));

await boss.start();
logger.info("Caldera workers started");

// token refresh every 60 seconds
await boss.work("token-refresh", { pollingIntervalSeconds: 60 }, async () => {
  await runTokenRefresh();
});

// schedule recurring job every minute
await boss.schedule("token-refresh", "* * * * *");

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, stopping workers");
  await boss.stop();
  process.exit(0);
});
