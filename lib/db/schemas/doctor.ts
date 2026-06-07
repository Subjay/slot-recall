import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { location } from "./location";

export const doctor = pgTable("doctors", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: text().notNull(),
  lastName: text().notNull(),
  locationId: uuid()
    .notNull()
    .references(() => location.id),
  phoneNumber: text().notNull(),
});
