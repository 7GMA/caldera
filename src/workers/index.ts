// Worker bootstrap — M6+ workers registered here
import { logger } from "../lib/logger.js";

logger.info("Caldera workers starting (placeholder — M6+ implements workers)");

// Placeholder: keep process alive for health checks in compose
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down workers");
  process.exit(0);
});
