import database from "../../db/index";
import {
  DoctorFilters,
  DoctorOrderBy,
  DoctorRecord,
  DoctorSelect,
  DoctorsFilters,
} from "./types";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { doctor } from "@/lib/db/schemas/doctor";

const orderColumns = {
  id: doctor.id,
  firstName: doctor.firstName,
  lastName: doctor.lastName,
  locationId: doctor.locationId,
  phoneNumber: doctor.phoneNumber,
} as const satisfies Record<keyof DoctorRecord, unknown>;

function buildWhereClause(criteria?: DoctorSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria?.id !== undefined ? eq(doctor.id, criteria.id) : undefined,
    criteria?.firstName !== undefined
      ? eq(doctor.firstName, criteria.firstName)
      : undefined,
    criteria?.lastName !== undefined
      ? eq(doctor.lastName, criteria.lastName)
      : undefined,
    criteria?.locationId !== undefined
      ? eq(doctor.locationId, criteria.locationId)
      : undefined,
    criteria?.phoneNumber !== undefined
      ? eq(doctor.phoneNumber, criteria.phoneNumber)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: DoctorOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof DoctorRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getDoctors({
  criteria,
  orderBy,
  limit,
}: DoctorsFilters = {}): Promise<DoctorRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(doctor)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(doctor)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(doctor).where(where).limit(limit)
        : await database.select().from(doctor).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(doctor)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(doctor)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(doctor).limit(limit)
      : await database.select().from(doctor);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getDoctor({
  criteria,
  orderBy,
}: DoctorFilters = {}): Promise<DoctorRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(doctor)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database
        .select()
        .from(doctor)
        .where(where)
        .limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(doctor)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(doctor).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
