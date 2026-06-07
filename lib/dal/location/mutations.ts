import { location } from "@/lib/db/schemas/location";
import { LocationInsert, LocationRecord, LocationUpdate } from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createLocation(
  values: LocationInsert,
): Promise<LocationRecord> {
  try {
    const [record] = await database.insert(location).values(values).returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateLocation(
  values: LocationUpdate,
): Promise<LocationRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(location)
      .set(updateValues)
      .where(eq(location.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteLocation(
  id: LocationRecord["id"],
): Promise<LocationRecord> {
  try {
    const [record] = await database
      .delete(location)
      .where(eq(location.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
