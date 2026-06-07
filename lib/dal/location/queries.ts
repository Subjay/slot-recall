import database from "../../db/index";
import {
  LocationFilters,
  LocationOrderBy,
  LocationRecord,
  LocationSelect,
  LocationsFilters,
} from "./types";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { location } from "@/lib/db/schemas/location";

const orderColumns = {
  id: location.id,
  address: location.address,
  city: location.city,
  coordinates: location.coordinates,
} as const satisfies Record<keyof LocationRecord, unknown>;

function buildWhereClause(criteria?: LocationSelect) {
  if (!criteria) return undefined;

  const filters = [
    criteria?.id !== undefined ? eq(location.id, criteria.id) : undefined,
    criteria?.address !== undefined
      ? eq(location.address, criteria.address)
      : undefined,
    criteria?.city !== undefined ? eq(location.city, criteria.city) : undefined,
    criteria?.coordinates !== undefined
      ? eq(location.coordinates, criteria.coordinates)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) return undefined;

  if (filters.length === 1) return filters[0];

  return and(...filters);
}

function buildOrderClause(orderBy?: LocationOrderBy) {
  if (!orderBy) {
    return [];
  }
  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof LocationRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getLocations({
  criteria,
  orderBy,
  limit,
}: LocationsFilters = {}): Promise<LocationRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(location)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(location)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(location).where(where).limit(limit)
        : await database.select().from(location).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(location)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(location)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(location).limit(limit)
      : await database.select().from(location);
    return data;
  } catch {
    throw new Error();
  }
}

export async function getLocation({
  criteria,
  orderBy,
}: LocationFilters = {}): Promise<LocationRecord | null> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const [record] = await database
        .select()
        .from(location)
        .where(where)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    if (where) {
      const [record] = await database
        .select()
        .from(location)
        .where(where)
        .limit(1);
      return record ?? null;
    }

    if (order.length > 0) {
      const [record] = await database
        .select()
        .from(location)
        .orderBy(...order)
        .limit(1);
      return record ?? null;
    }

    const [record] = await database.select().from(location).limit(1);
    return record ?? null;
  } catch {
    throw new Error();
  }
}
