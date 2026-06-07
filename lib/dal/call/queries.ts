import { call } from "@/lib/db/schemas/call";
import database from "../../db/index";
import {
  CallFilters,
  CallOrderBy,
  CallRecord,
  CallSelect,
  CallsFilters,
} from "./types";
import { and, asc, desc, eq } from "drizzle-orm";

const orderColumns = {
  id: call.id,
  clientId: call.clientId,
  status: call.status,
  answer: call.answer,
  reason: call.reason,
} as const satisfies Record<keyof CallRecord, unknown>;

function buildWhereClause(criteria?: CallSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria.id !== undefined ? eq(call.id, criteria.id) : undefined,
    criteria.clientId !== undefined
      ? eq(call.clientId, criteria.clientId)
      : undefined,
    criteria.status !== undefined
      ? eq(call.status, criteria.status)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: CallOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof CallRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getCalls({
  criteria,
  orderBy,
  limit,
}: CallsFilters = {}): Promise<CallRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(call)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(call)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(call).where(where).limit(limit)
        : await database.select().from(call).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(call)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(call)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(call).limit(limit)
      : await database.select().from(call);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getCall({
  criteria,
  orderBy,
}: CallFilters = {}): Promise<CallRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(call)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database.select().from(call).where(where).limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(call)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(call).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
