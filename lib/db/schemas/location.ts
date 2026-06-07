import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const location = pgTable("locations", {
  id: uuid().defaultRandom().primaryKey(),
  address: text().notNull(),
  city: text().notNull(),
  coordinates: jsonb().$type<[number, number]>().notNull(),
});
