import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
export const theses = sqliteTable("theses", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
export const runs = sqliteTable("research_runs", {
  id: text("id").primaryKey(),
  thesisId: text("thesis_id").notNull(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull(),
  reserved: real("reserved").notNull(),
  estimatedCost: real("estimated_cost"),
  result: text("result"),
});
