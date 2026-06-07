import { location } from "../../db/schemas/location";

export type LocationRecord = typeof location.$inferSelect;
export type LocationInsert = typeof location.$inferInsert;
export type LocationUpdate = Partial<LocationInsert> & {
  id: LocationRecord["id"];
};
export type LocationSelect = Partial<LocationRecord>;
export type LocationOrderBy = Partial<
  Record<keyof LocationRecord, "asc" | "desc">
>;

export type LocationsFilters = {
  criteria?: LocationSelect;
  orderBy?: LocationOrderBy;
  limit?: number;
};

export type LocationFilters = {
  criteria?: LocationSelect;
  orderBy?: LocationOrderBy;
};
