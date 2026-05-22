import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  email: text("email").notNull(),
  telephone: text("telephone"),
  statut_pro: text("statut_pro").notNull(),
  revenus_nets: numeric("revenus_nets", { precision: 12, scale: 2 }).notNull(),
  autres_revenus: numeric("autres_revenus", { precision: 12, scale: 2 }),
  charges_fixes: numeric("charges_fixes", { precision: 12, scale: 2 }).notNull(),
  patrimoine: numeric("patrimoine", { precision: 15, scale: 2 }),
  ficp: boolean("ficp").notNull().default(false),
  ppe: boolean("ppe").notNull().default(false),
  lcb_ft: boolean("lcb_ft").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, created_at: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
