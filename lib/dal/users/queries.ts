import {
  UserFilters,
  UserOrder,
  UserRecord,
  UserSelect,
  UsersFilters,
} from "./types";
import database from "@db/index";
import { user } from "@db/schemas/user";
import { and, asc, desc, eq, isNull, SQL } from "drizzle-orm";
import { CriteriaError, SelectError } from "@dal/shared/errors";

export const orderColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.image,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  username: user.username,
  displayUsername: user.displayUsername,
  role: user.role,
  banned: user.banned,
  banReason: user.banReason,
  banExpires: user.banExpires,
} as const satisfies Record<keyof UserRecord, unknown>;

function buildWhereClause(criteria?: UserSelect) {
  const filters = [
    criteria?.id !== undefined ? eq(user.id, criteria.id) : undefined,
    criteria?.name !== undefined ? eq(user.name, criteria.name) : undefined,
    criteria?.email !== undefined ? eq(user.email, criteria.email) : undefined,
    criteria?.emailVerified !== undefined
      ? eq(user.emailVerified, criteria.emailVerified)
      : undefined,
    criteria?.image !== undefined
      ? criteria.image === null
        ? isNull(user.image)
        : eq(user.image, criteria.image)
      : undefined,
    criteria?.createdAt !== undefined
      ? eq(user.createdAt, criteria.createdAt)
      : undefined,
    criteria?.updatedAt !== undefined
      ? eq(user.updatedAt, criteria.updatedAt)
      : undefined,
    criteria?.username !== undefined
      ? eq(user.username, criteria.username)
      : undefined,
    criteria?.displayUsername !== undefined
      ? criteria.displayUsername === null
        ? isNull(user.displayUsername)
        : eq(user.displayUsername, criteria.displayUsername)
      : undefined,
    criteria?.role !== undefined
      ? criteria.role === null
        ? isNull(user.role)
        : eq(user.role, criteria.role)
      : undefined,
    criteria?.banned !== undefined
      ? criteria.banned === null
        ? isNull(user.banned)
        : eq(user.banned, criteria.banned)
      : undefined,
    criteria?.banReason !== undefined
      ? criteria.banReason === null
        ? isNull(user.banReason)
        : eq(user.banReason, criteria.banReason)
      : undefined,
    criteria?.banExpires !== undefined
      ? criteria.banExpires === null
        ? isNull(user.banExpires)
        : eq(user.banExpires, criteria.banExpires)
      : undefined,
  ].filter((filter) => filter !== undefined);

  if (filters.length === 0) {
    return undefined;
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return and(...filters);
}

function buildOrderClause(orderBy?: UserOrder): SQL[] {
  if (!orderBy) {
    return [];
  }

  return Object.entries(orderBy).flatMap(([field, direction]) => {
    const column = orderColumns[field as keyof UserRecord];

    if (!column || (direction !== "asc" && direction !== "desc")) {
      return [];
    }

    return direction === "asc" ? asc(column) : desc(column);
  });
}

export async function getUsers({
  criteria,
  orderBy,
  limit,
}: UsersFilters): Promise<UserRecord[]> {
  try {
    const where = buildWhereClause(criteria);
    const order = buildOrderClause(orderBy);

    if (where && order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(user)
            .where(where)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(user)
            .where(where)
            .orderBy(...order);
      return data;
    }

    if (where) {
      const data = limit
        ? await database.select().from(user).where(where).limit(limit)
        : await database.select().from(user).where(where);
      return data;
    }

    if (order.length > 0) {
      const data = limit
        ? await database
            .select()
            .from(user)
            .orderBy(...order)
            .limit(limit)
        : await database
            .select()
            .from(user)
            .orderBy(...order);
      return data;
    }

    const data = limit
      ? await database.select().from(user).limit(limit)
      : await database.select().from(user);
    return data;
  } catch (e) {
    throw new SelectError();
  }
}

export async function getUser({
  criteria,
  orderBy,
}: UserFilters): Promise<UserRecord | null> {
  const where = buildWhereClause(criteria);
  const order = buildOrderClause(orderBy);

  if (!where) {
    throw new CriteriaError();
  }

  try {
    const [record] =
      order.length > 0
        ? await database
            .select()
            .from(user)
            .where(where)
            .orderBy(...order)
            .limit(1)
        : await database.select().from(user).where(where).limit(1);
    return record ?? null;
  } catch {
    throw new SelectError();
  }
}
