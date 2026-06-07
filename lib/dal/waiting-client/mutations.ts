import { waitingClient } from "@/lib/db/schemas/waiting-client";
import {
  WaitingClientInsert,
  WaitingClientRecord,
  WaitingClientUpdate,
} from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createWaitingClient(
  values: WaitingClientInsert,
): Promise<WaitingClientRecord> {
  try {
    const [record] = await database
      .insert(waitingClient)
      .values(values)
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateWaitingClient(
  values: WaitingClientUpdate,
): Promise<WaitingClientRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(waitingClient)
      .set(updateValues)
      .where(eq(waitingClient.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteWaitingClient(
  id: WaitingClientRecord["id"],
): Promise<WaitingClientRecord> {
  try {
    const [record] = await database
      .delete(waitingClient)
      .where(eq(waitingClient.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
