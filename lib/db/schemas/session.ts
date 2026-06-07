import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./user";

export const session = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp().notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);
