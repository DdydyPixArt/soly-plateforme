import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clientsTable } from "@workspace/db";
import {
  ListClientsResponse,
  CreateClientBody,
  GetClientParams,
  GetClientResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.created_at);
  res.json(ListClientsResponse.parse(clients.map(c => ({
    ...c,
    revenus_nets: parseFloat(c.revenus_nets),
    autres_revenus: c.autres_revenus ? parseFloat(c.autres_revenus) : null,
    charges_fixes: parseFloat(c.charges_fixes),
    patrimoine: c.patrimoine ? parseFloat(c.patrimoine) : null,
    created_at: c.created_at.toISOString(),
  }))));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values({
    ...parsed.data,
    revenus_nets: parsed.data.revenus_nets.toString(),
    autres_revenus: parsed.data.autres_revenus?.toString(),
    charges_fixes: parsed.data.charges_fixes.toString(),
    patrimoine: parsed.data.patrimoine?.toString(),
  }).returning();
  res.status(201).json(GetClientResponse.parse({
    ...client,
    revenus_nets: parseFloat(client.revenus_nets),
    autres_revenus: client.autres_revenus ? parseFloat(client.autres_revenus) : null,
    charges_fixes: parseFloat(client.charges_fixes),
    patrimoine: client.patrimoine ? parseFloat(client.patrimoine) : null,
    created_at: client.created_at.toISOString(),
  }));
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(GetClientResponse.parse({
    ...client,
    revenus_nets: parseFloat(client.revenus_nets),
    autres_revenus: client.autres_revenus ? parseFloat(client.autres_revenus) : null,
    charges_fixes: parseFloat(client.charges_fixes),
    patrimoine: client.patrimoine ? parseFloat(client.patrimoine) : null,
    created_at: client.created_at.toISOString(),
  }));
});

export default router;
