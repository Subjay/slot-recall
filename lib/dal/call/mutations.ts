import { call } from "@/lib/db/schemas/call";
import { CallInsert, CallRecord, CallUpdate } from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createCall(values: CallInsert): Promise<CallRecord> {
  try {
    const [record] = await database.insert(call).values(values).returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateCall(values: CallUpdate): Promise<CallRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(call)
      .set(updateValues)
      .where(eq(call.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteCall(id: CallRecord["id"]): Promise<CallRecord> {
  try {
    const [record] = await database
      .delete(call)
      .where(eq(call.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
