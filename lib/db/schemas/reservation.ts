import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { client } from "./client";
import { doctor } from "./doctor";

export const reservationStatus = pgEnum("reservation_status", [
  "booked",
  "cancelled",
  "rebooked",
]);

export const reservation = pgTable("reservations", {
  id: uuid().defaultRandom().primaryKey(),
  status: reservationStatus().notNull(),
  startDate: timestamp().notNull(),
  duration: integer().notNull(),
  doctorId: uuid()
    .notNull()
    .references(() => doctor.id),
  clientId: uuid()
    .notNull()
    .references(() => client.id),
});
