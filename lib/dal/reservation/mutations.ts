import { reservation } from "@/lib/db/schemas/reservation";
import {
  ReservationInsert,
  ReservationRecord,
  ReservationUpdate,
} from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createReservation(
  values: ReservationInsert,
): Promise<ReservationRecord> {
  try {
    const [record] = await database
      .insert(reservation)
      .values(values)
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateReservation(
  values: ReservationUpdate,
): Promise<ReservationRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(reservation)
      .set(updateValues)
      .where(eq(reservation.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteReservation(
  id: ReservationRecord["id"],
): Promise<ReservationRecord> {
  try {
    const [record] = await database
      .delete(reservation)
      .where(eq(reservation.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
