import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { UserInsert, UserRecord, UserUpdate } from "./types";
import database from "@db/index";
import { user as userTable } from "@db/schemas/user";
import { account as accountTable } from "@db/schemas/account";
import { DeleteError, InsertError, UpdateError } from "@dal/shared/errors";

export async function createUser(
  values: UserInsert & { password: string },
): Promise<UserRecord> {
  const { password, ...userValues } = values;

  try {
    const record = await database.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(userTable)
        .values(userValues)
        .returning();

      await tx.insert(accountTable).values({
        id: randomUUID(),
        accountId: createdUser.id,
        providerId: "credential",
        userId: createdUser.id,
        password,
        updatedAt: new Date(),
      });

      return createdUser;
    });

    return record;
  } catch {
    throw new InsertError();
  }
}
export async function updateUser(
  values: UserUpdate & { password?: string },
): Promise<UserRecord> {
  const { id, password, ...updateValues } = values;

  try {
    const record = await database.transaction(async (tx) => {
      if (password !== undefined) {
        await tx
          .update(accountTable)
          .set({
            password,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(accountTable.userId, id),
              eq(accountTable.providerId, "credential"),
            ),
          );
      }

      const [updatedUser] = await tx
        .update(userTable)
        .set(updateValues)
        .where(eq(userTable.id, id))
        .returning();

      return updatedUser;
    });

    return record;
  } catch {
    throw new UpdateError();
  }
}

export async function deleteUser(id: UserRecord["id"]): Promise<UserRecord> {
  try {
    const [record] = await database
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning();

    return record;
  } catch {
    throw new DeleteError();
  }
}

export async function deleteUsers(ids: UserRecord["id"][]): Promise<number> {
  try {
    if (ids.length === 0) {
      throw new DeleteError("Arg 'ids' cannot be empty.");
    }

    const deletedRows = await database
      .delete(userTable)
      .where(inArray(userTable.id, ids))
      .returning();

    return deletedRows.length;
  } catch {
    throw new DeleteError();
  }
}

export async function deleteAllUsers(): Promise<number> {
  try {
    return (await database.delete(userTable).returning()).length;
  } catch {
    throw new DeleteError();
  }
}
