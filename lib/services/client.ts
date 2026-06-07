import { getClient, getClients } from "@/lib/dal/client/queries";
import type { ClientRecord, ClientSelect } from "@/lib/dal/client/types";

export async function queryAllClients(): Promise<ClientRecord[]> {
  return getClients();
}

export async function findClient(
  criteria: ClientSelect,
): Promise<ClientRecord | null> {
  return getClient({ criteria });
}
