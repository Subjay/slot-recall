import database from "../../db/index";
import {
  ClientFilters,
  ClientOrderBy,
  ClientRecord,
  ClientSelect,
  ClientsFilters,
} from "./types";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { client } from "@/lib/db/schemas/client";

const orderColumns = {
  id: client.id,
  availability: client.availability,
  firstName: client.firstName,
  lastName: client.lastName,
  locationId: client.locationId,
  phoneNumber: client.phoneNumber,
  rejectionRate: client.rejectionRate,
} as const satisfies Record<keyof ClientRecord, unknown>;

function buildWhereClause(criteria?: ClientSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria?.id !== undefined ? eq(client.id, criteria.id) : undefined,
    criteria?.availability !== undefined
      ? criteria.availability === null
        ? isNull(client.availability)
        : eq(client.availability, criteria.availability)
      : undefined,
    criteria?.firstName !== undefined
      ? eq(client.firstName, criteria.firstName)
      : undefined,
    criteria?.lastName !== undefined
      ? eq(client.lastName, criteria.lastName)
      : undefined,
    criteria?.locationId !== undefined
      ? eq(client.locationId, criteria.locationId)
      : undefined,
    criteria?.phoneNumber !== undefined
      ? eq(client.phoneNumber, criteria.phoneNumber)
      : undefined,
    criteria?.rejectionRate !== undefined
      ? eq(client.rejectionRate, criteria.rejectionRate)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: ClientOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof ClientRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getClients({
  criteria,
  orderBy,
  limit,
}: ClientsFilters = {}): Promise<ClientRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(client)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(client)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(client).where(where).limit(limit)
        : await database.select().from(client).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(client)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(client)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(client).limit(limit)
      : await database.select().from(client);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getClient({
  criteria,
  orderBy,
}: ClientFilters = {}): Promise<ClientRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(client)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database
        .select()
        .from(client)
        .where(where)
        .limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(client)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(client).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
