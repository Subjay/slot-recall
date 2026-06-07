import { boolean, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { client } from "./client";

export const waitingClientPriority = pgEnum("waiting_client_priority", [
  "high",
  "medium",
  "low",
]);

export const waitingClientStatus = pgEnum("waiting_client_status", [
  "pending",
  "resolved",
]);

export const waitingClient = pgTable("waiting_clients", {
  id: uuid().defaultRandom().primaryKey(),
  clientId: uuid()
    .notNull()
    .references(() => client.id),
  callDate: timestamp().notNull(),
  priority: waitingClientPriority().notNull(),
  status: waitingClientStatus().notNull(),
  recalled: boolean().notNull(),
});
