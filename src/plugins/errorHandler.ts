import type { FastifyInstance, FastifyError } from "fastify";
import { CalendarProviderError } from "../providers/errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((rawErr: FastifyError, _req, reply) => {
    const err = rawErr as FastifyError & { statusCode?: number };
    if (err instanceof CalendarProviderError && err.statusCode) {
      return reply.status(err.statusCode).send({ error: err.name, message: err.message });
    }

    const statusCode = err.statusCode ?? (err as { status?: number }).status;
    if (statusCode && statusCode < 500) {
      return reply.status(statusCode).send({ error: "request_error", message: err.message });
    }

    app.log.error(err, "internal error");
    return reply.status(500).send({ error: "internal_error", message: "An internal error occurred" });
  });
}
