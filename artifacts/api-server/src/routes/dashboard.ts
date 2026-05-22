import { Router, type IRouter } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db, dossiersTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetPipelineStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const rows = await db.select({
    statut: dossiersTable.statut,
    cnt: count(),
    total_montant: sql<string>`sum(${dossiersTable.montant})`,
    avg_montant: sql<string>`avg(${dossiersTable.montant})`,
  }).from(dossiersTable).groupBy(dossiersTable.statut);

  let total_dossiers = 0;
  let en_attente = 0;
  let approuves = 0;
  let refuses = 0;
  let conditionnels = 0;
  let montant_total = 0;

  for (const row of rows) {
    total_dossiers += Number(row.cnt);
    if (row.statut === "en_attente_risque" || row.statut === "en_cours_analyse") en_attente += Number(row.cnt);
    if (row.statut === "approuve") approuves += Number(row.cnt);
    if (row.statut === "refuse") refuses += Number(row.cnt);
    if (row.statut === "conditionnel") conditionnels += Number(row.cnt);
    if (row.statut === "approuve" || row.statut === "conditionnel") montant_total += parseFloat(row.total_montant || "0");
  }

  const taux_accord = total_dossiers > 0 ? (approuves + conditionnels) / total_dossiers : 0;

  res.json(GetDashboardStatsResponse.parse({
    total_dossiers,
    en_attente,
    approuves,
    refuses,
    conditionnels,
    taux_accord: Math.round(taux_accord * 1000) / 1000,
    montant_total_engage: Math.round(montant_total * 100) / 100,
    score_moyen: 742,
  }));
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const rows = await db.select({
    statut: dossiersTable.statut,
    cnt: count(),
  }).from(dossiersTable).groupBy(dossiersTable.statut);

  const labels: Record<string, string> = {
    brouillon: "Brouillon",
    en_attente_risque: "En attente Risque",
    en_cours_analyse: "En cours d'analyse",
    approuve: "Approuvé",
    refuse: "Refusé",
    conditionnel: "Conditionnel",
    archive: "Archivé",
  };

  const result = rows.map(r => ({
    statut: r.statut,
    count: Number(r.cnt),
    label: labels[r.statut] || r.statut,
  }));

  res.json(GetPipelineStatsResponse.parse(result));
});

export default router;
