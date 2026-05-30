import { Router, type IRouter } from "express";
import { getSettings, updateSettings } from "../lib/scoring-settings.js";
import { db, auditLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/scoring/settings", (_req, res): void => {
  res.json(getSettings());
});

router.put("/scoring/settings", async (req, res): Promise<void> => {
  const patch = req.body as Record<string, number>;
  const updated = updateSettings(patch);
  await db.insert(auditLogsTable).values({
    utilisateur: "Administrateur SI",
    role: "Administrateur",
    action: `Mise à jour des paramètres de scoring — Taux max: ${updated.taux_endettement_max * 100}%, Score accord auto: ${updated.score_accord_auto}`,
    statut: "succes",
    details: JSON.stringify(updated),
  });
  res.json(updated);
});

export default router;
