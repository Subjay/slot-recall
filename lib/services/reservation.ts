import { and, gte, lte } from "drizzle-orm";

import { updateReservation } from "@/lib/dal/reservation/mutations";
import { getReservation } from "@/lib/dal/reservation/queries";
import database from "@/lib/db";
import { reservation } from "@/lib/db/schemas/reservation";
import type {
  ReservationRecord,
  ReservationSelect,
  ReservationUpdate,
} from "@/lib/dal/reservation/types";

export async function queryReservationsBetweenDates(
  startDate: Date,
  endDate: Date,
): Promise<ReservationRecord[]> {
  return database
    .select()
    .from(reservation)
    .where(
      and(
        gte(reservation.startDate, startDate),
        lte(reservation.startDate, endDate),
      ),
    );
}

export async function setReservationStatus(
  id: ReservationRecord["id"],
  status: ReservationRecord["status"],
): Promise<ReservationRecord> {
  return updateReservation({ id, status });
}

export async function setReservation(
  values: ReservationUpdate,
): Promise<ReservationRecord> {
  return updateReservation(values);
}

export async function findReservation(
  criteria: ReservationSelect,
): Promise<ReservationRecord | null> {
  return getReservation({ criteria });
}
