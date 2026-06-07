import { doctor } from "../../db/schemas/doctor";

export type DoctorRecord = typeof doctor.$inferSelect;
export type DoctorInsert = typeof doctor.$inferInsert;
export type DoctorUpdate = Partial<DoctorInsert> & { id: DoctorRecord["id"] };
export type DoctorSelect = Partial<DoctorRecord>;
export type DoctorOrderBy = Partial<Record<keyof DoctorRecord, "asc" | "desc">>;

export type DoctorsFilters = {
  criteria?: DoctorSelect;
  orderBy?: DoctorOrderBy;
  limit?: number;
};

export type DoctorFilters = {
  criteria?: DoctorSelect;
  orderBy?: DoctorOrderBy;
};
