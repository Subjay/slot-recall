import { user } from "@db/schemas/user";
import { AtLeastOne } from "@lib/types";

export type UserInsert = typeof user.$inferInsert;
export type UserUpdate = Partial<UserInsert> & { id: string };
export type UserRecord = typeof user.$inferSelect;
export type UserSelect = Partial<UserRecord>;
export type UserOrder = Partial<Record<keyof UserRecord, "asc" | "desc">>;

export type UsersFilters = {
  criteria?: UserSelect;
  orderBy?: UserOrder;
  limit?: number;
};

export type UserFilters = {
  criteria: AtLeastOne<UserSelect>;
  orderBy?: UserOrder;
};
