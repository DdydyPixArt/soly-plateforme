import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, decisionsTable, dossiersTable, auditLogsTable } from "@workspace/db";
import {
  ListDecisionsResponse,
  CreateDecisionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseDecision(d: typeof decisionsTable.$inferSelect) {
  return { ...d, created_at: d.created_at.toISOString() };
}

router.get("/decisions", async (_req, res): Promise<void> => {
  const rows = await db.select().from(decisionsTable).orderBy(decisionsTable.created_at);
  res.json(ListDecisionsResponse.parse(rows.map(parseDecision)));
});

router.post("/decisions", async (req, res): Promise<void> => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [decision] = await db.insert(decisionsTable).values(parsed.data).returning();

  // Update dossier status
  const statusMap: Record<string, string> = {
    accord: "approuve",
    refus: "refuse",
    conditionnel: "conditionnel",
  };
  await db.update(dossiersTable)
    .set({ statut: statusMap[parsed.data.verdict] || "en_cours_analyse", updated_at: new Date() })
    .where(eq(dossiersTable.id, parsed.data.dossier_id));

  await db.insert(auditLogsTable).values({
    utilisateur: parsed.data.analyste,
    role: "Analyste Risque",
    action: `Décision ${parsed.data.verdict.toUpperCase()} sur dossier #${parsed.data.dossier_id}`,
    statut: "succes",
    details: parsed.data.commentaire,
  });

  res.status(201).json({ ...parseDecision(decision) });
});

export default router;
