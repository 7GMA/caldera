import type { FastifyInstance } from "fastify";
import { listAccounts, getAccount, deleteAccount } from "../services/accounts.js";

export async function accountsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/accounts", async (req, reply) => {
    const accounts = await listAccounts(req.endUserId);
    return reply.send({ accounts });
  });

  app.get<{ Params: { id: string } }>("/v1/accounts/:id", async (req, reply) => {
    const account = await getAccount(req.params.id, req.endUserId);
    return reply.send(account);
  });

  app.delete<{ Params: { id: string } }>("/v1/accounts/:id", async (req, reply) => {
    await deleteAccount(req.params.id, req.endUserId);
    return reply.status(204).send();
  });
}
