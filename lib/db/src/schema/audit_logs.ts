import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  utilisateur: text("utilisateur").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  statut: text("statut").notNull().default("succes"),
  details: text("details"),
  ip_address: text("ip_address"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, timestamp: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
