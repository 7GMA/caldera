import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.access_token",
      "*.refresh_token",
      "*.access_token_enc",
      "*.refresh_token_enc",
      "*.appSpecificPassword",
    ],
    censor: "[REDACTED]",
  },
});
