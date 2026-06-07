import { client } from "../../db/schemas/client";

export type ClientRecord = typeof client.$inferSelect;
export type ClientInsert = typeof client.$inferInsert;
export type ClientUpdate = Partial<ClientInsert> & { id: ClientRecord["id"] };
export type ClientSelect = Partial<ClientRecord>;
export type ClientOrderBy = Partial<Record<keyof ClientRecord, "asc" | "desc">>;

export type ClientsFilters = {
  criteria?: ClientSelect;
  orderBy?: ClientOrderBy;
  limit?: number;
};

export type ClientFilters = {
  criteria?: ClientSelect;
  orderBy?: ClientOrderBy;
};
