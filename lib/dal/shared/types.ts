import database from "@db/index";

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type Transaction = Parameters<
  Parameters<typeof database.transaction>[0]
>[0];
