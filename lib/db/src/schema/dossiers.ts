import { pgTable, serial, integer, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const dossiersTable = pgTable("dossiers", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull().references(() => clientsTable.id),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  duree_mois: integer("duree_mois").notNull(),
  objet: text("objet").notNull(),
  apport_personnel: numeric("apport_personnel", { precision: 12, scale: 2 }),
  statut: text("statut").notNull().default("brouillon"),
  avis_indicatif: text("avis_indicatif"),
  documents: jsonb("documents").$type<string[]>().default([]),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at"),
});

export const insertDossierSchema = createInsertSchema(dossiersTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertDossier = z.infer<typeof insertDossierSchema>;
export type Dossier = typeof dossiersTable.$inferSelect;
