import { reservation } from "../../db/schemas/reservation";

export type ReservationRecord = typeof reservation.$inferSelect;
export type ReservationInsert = typeof reservation.$inferInsert;
export type ReservationUpdate = Partial<ReservationInsert> & {
  id: ReservationRecord["id"];
};
export type ReservationSelect = Partial<ReservationRecord>;
export type ReservationOrderBy = Partial<
  Record<keyof ReservationRecord, "asc" | "desc">
>;

export type ReservationsFilters = {
  criteria?: ReservationSelect;
  orderBy?: ReservationOrderBy;
  limit?: number;
};

export type ReservationFilters = {
  criteria?: ReservationSelect;
  orderBy?: ReservationOrderBy;
};
