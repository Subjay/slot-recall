import { and, eq, ne } from "drizzle-orm";

import type { ClientRecord } from "@/lib/dal/client/types";
import type { WaitingClientRecord } from "@/lib/dal/waiting-client/types";
import database from "@/lib/db";
import { client } from "@/lib/db/schemas/client";
import { waitingClient } from "@/lib/db/schemas/waiting-client";

export type WaitingListItem = WaitingClientRecord & {
  client: ClientRecord;
};

export async function findWaitingClients(): Promise<WaitingListItem[]> {
  return database
    .select({
      id: waitingClient.id,
      clientId: waitingClient.clientId,
      callDate: waitingClient.callDate,
      priority: waitingClient.priority,
      status: waitingClient.status,
      recalled: waitingClient.recalled,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phoneNumber: client.phoneNumber,
        locationId: client.locationId,
        availability: client.availability,
        rejectionRate: client.rejectionRate,
      },
    })
    .from(waitingClient)
    .innerJoin(client, eq(waitingClient.clientId, client.id))
    .where(
      and(
        eq(waitingClient.recalled, false),
        ne(waitingClient.status, "resolved"),
      ),
    );
}
