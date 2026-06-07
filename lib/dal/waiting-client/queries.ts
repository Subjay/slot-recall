import database from "../../db/index";
import {
  WaitingClientFilters,
  WaitingClientOrderBy,
  WaitingClientRecord,
  WaitingClientSelect,
  WaitingClientsFilters,
} from "./types";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { waitingClient } from "@/lib/db/schemas/waiting-client";

const orderColumns = {
  id: waitingClient.id,
  clientId: waitingClient.clientId,
  callDate: waitingClient.callDate,
  priority: waitingClient.priority,
  status: waitingClient.status,
  recalled: waitingClient.recalled,
} as const satisfies Record<keyof WaitingClientRecord, unknown>;

function buildWhereClause(criteria?: WaitingClientSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria?.id !== undefined ? eq(waitingClient.id, criteria.id) : undefined,
    criteria?.clientId !== undefined
      ? eq(waitingClient.clientId, criteria.clientId)
      : undefined,
    criteria?.callDate !== undefined
      ? eq(waitingClient.callDate, criteria.callDate)
      : undefined,
    criteria?.priority !== undefined
      ? eq(waitingClient.priority, criteria.priority)
      : undefined,
    criteria?.status !== undefined
      ? eq(waitingClient.status, criteria.status)
      : undefined,
    criteria?.recalled !== undefined
      ? eq(waitingClient.recalled, criteria.recalled)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: WaitingClientOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof WaitingClientRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getWaitingClients({
  criteria,
  orderBy,
  limit,
}: WaitingClientsFilters = {}): Promise<WaitingClientRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(waitingClient)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(waitingClient)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(waitingClient).where(where).limit(limit)
        : await database.select().from(waitingClient).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(waitingClient)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(waitingClient)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(waitingClient).limit(limit)
      : await database.select().from(waitingClient);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getWaitingClient({
  criteria,
  orderBy,
}: WaitingClientFilters = {}): Promise<WaitingClientRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(waitingClient)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database
        .select()
        .from(waitingClient)
        .where(where)
        .limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(waitingClient)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(waitingClient).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
