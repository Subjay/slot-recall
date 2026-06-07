import { call } from "@/lib/db/schemas/call";

export type CallRecord = typeof call.$inferSelect;
export type CallInsert = typeof call.$inferInsert;
export type CallUpdate = Partial<CallInsert> & { id: CallRecord["id"] };
export type CallSelect = Partial<CallRecord>;
export type CallOrderBy = Partial<Record<keyof CallRecord, "asc" | "desc">>;

export type CallsFilters = {
  criteria?: CallSelect;
  orderBy?: CallOrderBy;
  limit?: number;
};

export type CallFilters = {
  criteria?: CallSelect;
  orderBy?: CallOrderBy;
};
