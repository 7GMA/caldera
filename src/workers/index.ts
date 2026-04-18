import PgBoss from "pg-boss";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { runTokenRefresh } from "./tokenRefresh.js";
import { renewExpiringWatches } from "./watchRenew.js";
import { pollCalDAVAccounts } from "./calDavPoll.js";
import { dispatchPendingWebhooks } from "./outboundWebhookDispatcher.js";

const boss = new PgBoss(env.DATABASE_URL);

boss.on("error", (err) => logger.error(err, "pg-boss error"));

await boss.start();
logger.info("Caldera workers started");

await boss.work("token-refresh", { pollingIntervalSeconds: 60 }, async () => {
  await runTokenRefresh();
});

await boss.work("watch-renew", { pollingIntervalSeconds: 300 }, async () => {
  await renewExpiringWatches();
});

await boss.work("caldav-poll", { pollingIntervalSeconds: 60 }, async () => {
  await pollCalDAVAccounts();
});

await boss.work("webhook-dispatch", { pollingIntervalSeconds: 10 }, async () => {
  await dispatchPendingWebhooks();
});

// Recurring schedules
await boss.schedule("token-refresh", "* * * * *");
await boss.schedule("watch-renew", "*/5 * * * *");
await boss.schedule("caldav-poll", "* * * * *");
await boss.schedule("webhook-dispatch", "* * * * *");

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, stopping workers");
  await boss.stop();
  process.exit(0);
});
