import { createApplication } from "../src/services/auth.js";
import { logger } from "../src/lib/logger.js";

const name = process.argv[2] ?? "dev-app";
const email = process.argv[3] ?? "dev@localhost";

const { applicationId, apiKeyPlaintext } = await createApplication(name, email);

logger.info({ applicationId, apiKey: apiKeyPlaintext }, "Application created");
console.log("\n─────────────────────────────────────────────");
console.log("Application ID :", applicationId);
console.log("API Key        :", apiKeyPlaintext);
console.log("─────────────────────────────────────────────");
console.log("Save the API key — it will not be shown again.\n");
