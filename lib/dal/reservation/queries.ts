import database from "../../db/index";
import {
  ReservationFilters,
  ReservationOrderBy,
  ReservationRecord,
  ReservationSelect,
  ReservationsFilters,
} from "./types";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { reservation } from "@/lib/db/schemas/reservation";

const orderColumns = {
  id: reservation.id,
  clientId: reservation.clientId,
  doctorId: reservation.doctorId,
  duration: reservation.duration,
  startDate: reservation.startDate,
  status: reservation.status,
} as const satisfies Record<keyof ReservationRecord, unknown>;

function buildWhereClause(criteria?: ReservationSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria?.id !== undefined ? eq(reservation.id, criteria.id) : undefined,
    criteria?.clientId !== undefined
      ? eq(reservation.clientId, criteria.clientId)
      : undefined,
    criteria?.doctorId !== undefined
      ? eq(reservation.doctorId, criteria.doctorId)
      : undefined,
    criteria?.duration !== undefined
      ? eq(reservation.duration, criteria.duration)
      : undefined,
    criteria?.startDate !== undefined
      ? eq(reservation.startDate, criteria.startDate)
      : undefined,
    criteria?.status !== undefined
      ? eq(reservation.status, criteria.status)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: ReservationOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof ReservationRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getReservations({
  criteria,
  orderBy,
  limit,
}: ReservationsFilters = {}): Promise<ReservationRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(reservation)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(reservation)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(reservation).where(where).limit(limit)
        : await database.select().from(reservation).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(reservation)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(reservation)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(reservation).limit(limit)
      : await database.select().from(reservation);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getReservation({
  criteria,
  orderBy,
}: ReservationFilters = {}): Promise<ReservationRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(reservation)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database
        .select()
        .from(reservation)
        .where(where)
        .limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(reservation)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(reservation).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
