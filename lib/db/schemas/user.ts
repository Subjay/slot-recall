import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull().default("User Name"),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text().notNull().unique(),
  displayUsername: text(),
  role: text(),
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp(),
});
