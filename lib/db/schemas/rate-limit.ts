import { pgTable, text, bigint, integer } from "drizzle-orm/pg-core";

export const rateLimit = pgTable("rate_limits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
