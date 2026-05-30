import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, clientsTable, dossiersTable, auditLogsTable } from "@workspace/db";
import {
  ListDossiersResponse,
  CreateDossierBody,
  GetDossierParams,
  GetDossierResponse,
  UpdateDossierParams,
  UpdateDossierBody,
  UpdateDossierResponse,
  SubmitDossierParams,
  SubmitDossierResponse,
  GetDossierScoreParams,
  GetDossierScoreResponse,
  ClaimDossierBody,
} from "@workspace/api-zod";
import { computeScoring } from "../lib/scoring.js";

const router: IRouter = Router();

function parseDossier(d: typeof dossiersTable.$inferSelect, client?: typeof clientsTable.$inferSelect) {
  return {
    ...d,
    montant: parseFloat(d.montant),
    apport_personnel: d.apport_personnel ? parseFloat(d.apport_personnel) : null,
    documents: (d.documents as string[]) || [],
    created_at: d.created_at.toISOString(),
    updated_at: d.updated_at ? d.updated_at.toISOString() : null,
    client: client ? {
      ...client,
      revenus_nets: parseFloat(client.revenus_nets),
      autres_revenus: client.autres_revenus ? parseFloat(client.autres_revenus) : null,
      charges_fixes: parseFloat(client.charges_fixes),
      patrimoine: client.patrimoine ? parseFloat(client.patrimoine) : null,
      created_at: client.created_at.toISOString(),
    } : undefined,
  };
}

router.get("/dossiers", async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const created_by = req.query.created_by as string | undefined;

  let query = db.select({ dossier: dossiersTable, client: clientsTable })
    .from(dossiersTable)
    .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
    .orderBy(desc(dossiersTable.created_at));

  let rows;
  if (status && created_by) {
    rows = await db.select({ dossier: dossiersTable, client: clientsTable })
      .from(dossiersTable)
      .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
      .where(and(eq(dossiersTable.statut, status), eq(dossiersTable.created_by, created_by)))
      .orderBy(desc(dossiersTable.created_at));
  } else if (status) {
    rows = await db.select({ dossier: dossiersTable, client: clientsTable })
      .from(dossiersTable)
      .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
      .where(eq(dossiersTable.statut, status))
      .orderBy(desc(dossiersTable.created_at));
  } else if (created_by) {
    rows = await db.select({ dossier: dossiersTable, client: clientsTable })
      .from(dossiersTable)
      .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
      .where(eq(dossiersTable.created_by, created_by))
      .orderBy(desc(dossiersTable.created_at));
  } else {
    rows = await query;
  }

  const result = rows.map(({ dossier, client }) => parseDossier(dossier, client ?? undefined));
  res.json(ListDossiersResponse.parse(result));
});

router.post("/dossiers", async (req, res): Promise<void> => {
  const parsed = CreateDossierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.client_id));
  let avis_indicatif = "analyse_requise";
  if (client) {
    const scoring = computeScoring({
      revenus_nets: parseFloat(client.revenus_nets),
      autres_revenus: client.autres_revenus ? parseFloat(client.autres_revenus) : 0,
      charges_fixes: parseFloat(client.charges_fixes),
      montant: parsed.data.montant,
      duree_mois: parsed.data.duree_mois,
      apport_personnel: parsed.data.apport_personnel ?? 0,
      ficp: client.ficp,
      ppe: client.ppe,
      statut_pro: client.statut_pro,
      patrimoine: client.patrimoine ? parseFloat(client.patrimoine) : 0,
    });
    avis_indicatif = scoring.avis;
  }
  const [dossier] = await db.insert(dossiersTable).values({
    client_id: parsed.data.client_id,
    montant: parsed.data.montant.toString(),
    duree_mois: parsed.data.duree_mois,
    objet: parsed.data.objet,
    apport_personnel: parsed.data.apport_personnel?.toString(),
    avis_indicatif,
    documents: parsed.data.documents || [],
    created_by: parsed.data.created_by || "sophie.martin",
  }).returning();
  const utilisateur = parsed.data.created_by ? `Conseiller (${parsed.data.created_by})` : "Conseiller Bancaire";
  await db.insert(auditLogsTable).values({
    utilisateur,
    role: "Conseiller",
    action: `Création dossier #${dossier.id} — ${parsed.data.objet}`,
    statut: "succes",
  });
  res.status(201).json(GetDossierResponse.parse(parseDossier(dossier, client)));
});

router.get("/dossiers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDossierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select({ dossier: dossiersTable, client: clientsTable })
    .from(dossiersTable)
    .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
    .where(eq(dossiersTable.id, params.data.id));
  if (!rows[0]) { res.status(404).json({ error: "Dossier not found" }); return; }
  res.json(GetDossierResponse.parse(parseDossier(rows[0].dossier, rows[0].client ?? undefined)));
});

router.patch("/dossiers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDossierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateDossierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (parsed.data.montant !== undefined) updateData.montant = parsed.data.montant.toString();
  if (parsed.data.duree_mois !== undefined) updateData.duree_mois = parsed.data.duree_mois;
  if (parsed.data.objet !== undefined) updateData.objet = parsed.data.objet;
  if (parsed.data.apport_personnel !== undefined) updateData.apport_personnel = parsed.data.apport_personnel?.toString();
  if (parsed.data.documents !== undefined) updateData.documents = parsed.data.documents;
  const [dossier] = await db.update(dossiersTable).set(updateData as never).where(eq(dossiersTable.id, params.data.id)).returning();
  if (!dossier) { res.status(404).json({ error: "Dossier not found" }); return; }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, dossier.client_id));
  res.json(UpdateDossierResponse.parse(parseDossier(dossier, client)));
});

router.post("/dossiers/:id/claim", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ClaimDossierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Check if already assigned
  const [existing] = await db.select().from(dossiersTable).where(eq(dossiersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Dossier not found" }); return; }
  if (existing.assigned_to && existing.assigned_to !== parsed.data.analyste_login) {
    res.status(409).json({ error: `Dossier déjà pris en charge par ${existing.assigned_to}` });
    return;
  }
  const [dossier] = await db.update(dossiersTable)
    .set({ assigned_to: parsed.data.analyste_login, statut: "en_cours_analyse", updated_at: new Date() })
    .where(eq(dossiersTable.id, id))
    .returning();
  await db.insert(auditLogsTable).values({
    utilisateur: parsed.data.analyste_nom,
    role: "Analyste Risque",
    action: `Prise en charge dossier #${id} par ${parsed.data.analyste_nom}`,
    statut: "succes",
  });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, dossier.client_id));
  res.json(parseDossier(dossier, client));
});

router.post("/dossiers/:id/submit", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SubmitDossierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [dossier] = await db.update(dossiersTable)
    .set({ statut: "en_attente_risque", updated_at: new Date() })
    .where(eq(dossiersTable.id, params.data.id))
    .returning();
  if (!dossier) { res.status(404).json({ error: "Dossier not found" }); return; }
  await db.insert(auditLogsTable).values({
    utilisateur: dossier.created_by || "Conseiller Bancaire",
    role: "Conseiller",
    action: `Transmission dossier #${dossier.id} au service Risque`,
    statut: "succes",
  });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, dossier.client_id));
  res.json(SubmitDossierResponse.parse(parseDossier(dossier, client)));
});

router.get("/dossiers/:id/score", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDossierScoreParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select({ dossier: dossiersTable, client: clientsTable })
    .from(dossiersTable)
    .leftJoin(clientsTable, eq(dossiersTable.client_id, clientsTable.id))
    .where(eq(dossiersTable.id, params.data.id));
  if (!rows[0] || !rows[0].client) { res.status(404).json({ error: "Dossier or client not found" }); return; }
  const { dossier, client } = rows[0];
  const scoring = computeScoring({
    revenus_nets: parseFloat(client!.revenus_nets),
    autres_revenus: client!.autres_revenus ? parseFloat(client!.autres_revenus) : 0,
    charges_fixes: parseFloat(client!.charges_fixes),
    montant: parseFloat(dossier.montant),
    duree_mois: dossier.duree_mois,
    apport_personnel: dossier.apport_personnel ? parseFloat(dossier.apport_personnel) : 0,
    ficp: client!.ficp,
    ppe: client!.ppe,
    statut_pro: client!.statut_pro,
    patrimoine: client!.patrimoine ? parseFloat(client!.patrimoine) : 0,
  });
  res.json(GetDossierScoreResponse.parse({ dossier_id: dossier.id, ...scoring }));
});

export default router;
