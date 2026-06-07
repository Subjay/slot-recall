import { createCall, updateCall } from "@/lib/dal/call/mutations";
import { getCalls } from "@/lib/dal/call/queries";
import type {
  CallInsert,
  CallOrderBy,
  CallRecord,
  CallSelect,
  CallsFilters,
} from "@/lib/dal/call/types";
import type { ReservationRecord } from "@/lib/dal/reservation/types";
import database from "@/lib/db";
import { doctor } from "@/lib/db/schemas/doctor";
import { location } from "@/lib/db/schemas/location";
import { reservation } from "@/lib/db/schemas/reservation";
import { eq } from "drizzle-orm";

export type ReservationCallContext = {
  date: Date;
  doctorFirstName: string;
  doctorLastName: string;
  doctorPhone: string;
  locationAddress: string;
  locationCity: string;
};

export async function queryAllCalls({
  criteria,
  orderBy,
  limit = 5,
}: CallsFilters): Promise<CallRecord[]> {
  return getCalls({ criteria, orderBy });
}

export async function getReservationCallContext(
  reservationId: ReservationRecord["id"],
): Promise<ReservationCallContext | null> {
  const [record] = await database
    .select({
      date: reservation.startDate,
      doctorFirstName: doctor.firstName,
      doctorLastName: doctor.lastName,
      doctorPhone: doctor.phoneNumber,
      locationAddress: location.address,
      locationCity: location.city,
    })
    .from(reservation)
    .innerJoin(doctor, eq(reservation.doctorId, doctor.id))
    .innerJoin(location, eq(doctor.locationId, location.id))
    .where(eq(reservation.id, reservationId))
    .limit(1);

  return record ?? null;
}

export async function setCallStatus(
  id: CallRecord["id"],
  status: CallRecord["status"],
): Promise<CallRecord> {
  return updateCall({ id, status });
}

export async function addCall(values: CallInsert): Promise<CallRecord> {
  return createCall(values);
}
