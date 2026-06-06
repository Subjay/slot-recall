import {
  AppError,
  catchError,
  ErrorMessage,
  formatErrorMessage,
} from "@utils/errors";

export type DalError =
  | SelectError
  | UpdateError
  | InsertError
  | DeleteError
  | CriteriaError;

export class SelectError extends AppError {
  constructor(message?: string) {
    super(message ?? "wrong-select-request", {
      code: "SELECT_ERROR",
      status: 410,
    });
  }
}

export class InsertError extends AppError {
  constructor(message?: string) {
    super(message ?? "wrong-select-request", {
      code: "INSECT_ERROR",
      status: 411,
    });
  }
}

export class UpdateError extends AppError {
  constructor(message?: string) {
    super(message ?? "wrong-update-request", {
      code: "UPDATE_ERROR",
      status: 412,
    });
  }
}

export class DeleteError extends AppError {
  constructor(message?: string) {
    super(message ?? "wrong-delete-request", {
      code: "DELETE_ERROR",
      status: 413,
    });
  }
}

export class CriteriaError extends AppError {
  constructor(message?: string) {
    super(message ?? "wrong-criteria-request", {
      code: "CRITERIA_ERROR",
      status: 414,
    });
  }
}

export async function catchDalError<T>(
  promise: Promise<T>,
): Promise<[undefined, T] | [ErrorMessage]> {
  const [error, data] = await catchError(promise, [
    SelectError,
    InsertError,
    UpdateError,
    DeleteError,
    CriteriaError,
  ]);

  if (error) {
    return [formatErrorMessage(error)];
  }

  return [undefined, data];
}
