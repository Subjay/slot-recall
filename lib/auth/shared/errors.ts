import {
  AppError,
  catchError,
  ErrorMessage,
  formatErrorMessage,
} from "@utils/errors";

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super(message ?? "Sorry! You cannot access this ressource.", {
      code: "NO_AUTHORIZATION",
      status: 403,
    });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message?: string) {
    super(message ?? "You need to be logged in.", {
      code: "NO_AUTHENTICATION",
      status: 401,
    });
  }
}

export async function catchAuthError<T>(
  promise: Promise<T>,
): Promise<[undefined, T] | [ErrorMessage]> {
  const [error, data] = await catchError(promise, [
    UnauthenticatedError,
    UnauthorizedError,
  ]);

  if (error) {
    return [formatErrorMessage(error)];
  }

  return [undefined, data];
}
