import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dossiersTable } from "./dossiers";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  dossier_id: integer("dossier_id").notNull().references(() => dossiersTable.id),
  analyste: text("analyste").notNull(),
  verdict: text("verdict").notNull(),
  commentaire: text("commentaire").notNull(),
  conditions: text("conditions"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, created_at: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;
