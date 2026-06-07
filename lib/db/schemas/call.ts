import { boolean, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { client } from "./client";

export const callStatus = pgEnum("call_status", [
  "started",
  "ended",
  "voicemail",
]);

export const call = pgTable("calls", {
  id: uuid().defaultRandom().primaryKey(),
  clientId: uuid()
    .notNull()
    .references(() => client.id),
  status: callStatus().notNull(),
  answer: boolean().notNull(),
  reason: text(),
});
