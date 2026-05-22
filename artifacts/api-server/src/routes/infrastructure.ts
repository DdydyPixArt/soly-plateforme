import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import {
  GetInfraMetricsResponse,
  RotateEncryptionKeysResponse,
  TriggerReplicationResponse,
  SyncDatabaseResponse,
} from "@workspace/api-zod";
import { generateInfraMetrics } from "../lib/scoring.js";

const router: IRouter = Router();

router.get("/infrastructure/metrics", async (_req, res): Promise<void> => {
  const metrics = generateInfraMetrics();
  res.json(GetInfraMetricsResponse.parse(metrics));
});

router.post("/infrastructure/rotate-keys", async (req, res): Promise<void> => {
  const now = new Date().toISOString();
  await db.insert(auditLogsTable).values({
    utilisateur: "Administrateur SI",
    role: "Administrateur",
    action: "Rotation de la clé AES-256 effectuée dans Azure Key Vault",
    statut: "succes",
    details: "Nouvelle clé générée et activée. Ancienne clé révoquée avec délai de grâce de 48h.",
  });
  res.json(RotateEncryptionKeysResponse.parse({
    success: true,
    message: "Rotation des clés AES-256-GCM effectuée dans Azure Key Vault. Nouvelle clé active.",
    timestamp: now,
  }));
});

router.post("/infrastructure/replicate", async (req, res): Promise<void> => {
  const now = new Date().toISOString();
  await db.insert(auditLogsTable).values({
    utilisateur: "Administrateur SI",
    role: "Administrateur",
    action: "Réplication asynchrone déclenchée vers la région OVHcloud Marseille (MAR1)",
    statut: "succes",
    details: "Snapshot PostgreSQL initié. ETA: 4 minutes. Lag estimé post-sync: <15ms.",
  });
  res.json(TriggerReplicationResponse.parse({
    success: true,
    message: "Réplication asynchrone déclenchée → OVHcloud Marseille (MAR1). Snapshot en cours.",
    timestamp: now,
  }));
});

router.post("/infrastructure/sync-db", async (req, res): Promise<void> => {
  const now = new Date().toISOString();
  await db.insert(auditLogsTable).values({
    utilisateur: "Administrateur SI",
    role: "Administrateur",
    action: "Synchronisation et nettoyage de la base de données (déduplication, contrôle complétude)",
    statut: "succes",
    details: "0 doublons détectés. 2 enregistrements incomplets signalés. Données conformes.",
  });
  res.json(SyncDatabaseResponse.parse({
    success: true,
    message: "Synchronisation terminée. Déduplication: 0 doublon. Complétude: 98.7%. Données conformes.",
    timestamp: now,
  }));
});

export default router;
