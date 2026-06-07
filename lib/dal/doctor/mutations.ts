import { doctor } from "@/lib/db/schemas/doctor";
import { DoctorInsert, DoctorRecord, DoctorUpdate } from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createDoctor(
  values: DoctorInsert,
): Promise<DoctorRecord> {
  try {
    const [record] = await database.insert(doctor).values(values).returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateDoctor(
  values: DoctorUpdate,
): Promise<DoctorRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(doctor)
      .set(updateValues)
      .where(eq(doctor.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteDoctor(
  id: DoctorRecord["id"],
): Promise<DoctorRecord> {
  try {
    const [record] = await database
      .delete(doctor)
      .where(eq(doctor.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
