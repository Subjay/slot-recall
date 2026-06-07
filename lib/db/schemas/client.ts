import { pgEnum, pgTable, real, text, uuid } from "drizzle-orm/pg-core";

import { location } from "./location";

export const clientAvailability = pgEnum("client_availability", [
  "morning",
  "afternoon",
]);

export const client = pgTable("clients", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: text().notNull(),
  lastName: text().notNull(),
  phoneNumber: text().notNull(),
  locationId: uuid()
    .notNull()
    .references(() => location.id),
  availability: clientAvailability(),
  rejectionRate: real().notNull(),
});
