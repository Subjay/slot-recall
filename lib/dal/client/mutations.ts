import { client } from "@/lib/db/schemas/client";
import { ClientInsert, ClientRecord, ClientUpdate } from "./types";
import database from "../../db/index";
import { eq } from "drizzle-orm";

export async function createClient(
  values: ClientInsert,
): Promise<ClientRecord> {
  try {
    const [record] = await database.insert(client).values(values).returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function updateClient(
  values: ClientUpdate,
): Promise<ClientRecord> {
  const { id, ...updateValues } = values;

  try {
    const [record] = await database
      .update(client)
      .set(updateValues)
      .where(eq(client.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}

export async function deleteClient(
  id: ClientRecord["id"],
): Promise<ClientRecord> {
  try {
    const [record] = await database
      .delete(client)
      .where(eq(client.id, id))
      .returning();

    return record;
  } catch {
    throw new Error();
  }
}
