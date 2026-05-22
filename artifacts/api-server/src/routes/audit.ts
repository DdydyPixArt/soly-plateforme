import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogsTable, clientsTable } from "@workspace/db";
import {
  ListAuditLogsResponse,
  RequestDataPurgeBody,
  RequestDataPurgeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseLog(l: typeof auditLogsTable.$inferSelect) {
  return { ...l, timestamp: l.timestamp.toISOString() };
}

router.get("/audit-logs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.timestamp));
  res.json(ListAuditLogsResponse.parse(rows.map(parseLog)));
});

router.post("/audit-logs/purge-request", async (req, res): Promise<void> => {
  const parsed = RequestDataPurgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [log] = await db.insert(auditLogsTable).values({
    utilisateur: "Service Conformité",
    role: "Conformité",
    action: `Demande de purge RGPD Art. 17 — Client #${parsed.data.client_id} — Motif: ${parsed.data.motif}`,
    statut: "succes",
    details: "Demande enregistrée et transmise au DPO pour validation",
  }).returning();
  res.json(RequestDataPurgeResponse.parse(parseLog(log)));
});

export default router;
