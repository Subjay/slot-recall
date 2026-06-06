import {
  catchAuthError,
  // UnauthenticatedError,
  // UnauthorizedError,
} from "@auth/shared/errors";
import { ROLES, type Role } from "../shared/roles";
import { getSession } from "./session";
// import { ErrorMessage } from "@utils/errors";
import { catchDalError } from "@dal/shared/errors";

export async function hasAuthorization(role: Role) {
  const [error, session] = await catchAuthError(getSession());

  if (error || !session) {
    return false;
  }

  return session.role === role;
}

export async function hasAdminAuthorization() {
  return hasAuthorization(ROLES.ADMIN);
}

export async function requireAuthorization<T>(
  authorizedRoles: Role[] = [ROLES.USER],
  promise: Promise<T>,
): Promise<[string] | [undefined, T]> {
  const [error, session] = await catchAuthError(getSession());

  if (error !== undefined) {
    return [error.message];
  }

  if (session === null) {
    return ["You don't have a valid session."];
  }

  if (
    session.role === undefined ||
    session.role === null ||
    !authorizedRoles.includes(session.role as Role)
  ) {
    return ["This ressource is protected."];
  }

  const [dataError, data] = await catchDalError(promise);

  if (dataError) {
    return [dataError.message];
  }

  return [undefined, data];
}

export async function requireAdminAuthorization<T>(
  promise: Promise<T>,
): Promise<[string] | [undefined, T]> {
  return await requireAuthorization([ROLES.ADMIN], promise);
}
