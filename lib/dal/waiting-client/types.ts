import { waitingClient } from "../../db/schemas/waiting-client";

export type WaitingClientRecord = typeof waitingClient.$inferSelect;
export type WaitingClientInsert = typeof waitingClient.$inferInsert;
export type WaitingClientUpdate = Partial<WaitingClientInsert> & {
  id: WaitingClientRecord["id"];
};
export type WaitingClientSelect = Partial<WaitingClientRecord>;
export type WaitingClientOrderBy = Partial<
  Record<keyof WaitingClientRecord, "asc" | "desc">
>;

export type WaitingClientsFilters = {
  criteria?: WaitingClientSelect;
  orderBy?: WaitingClientOrderBy;
  limit?: number;
};

export type WaitingClientFilters = {
  criteria?: WaitingClientSelect;
  orderBy?: WaitingClientOrderBy;
};
