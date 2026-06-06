export type ErrorMessage = {
  status: number;
  message: string;
};

type AppErrorOptions = ErrorOptions & {
  code?: string;
  status?: number;
};

export class AppError extends Error {
  code: string;
  status: number;

  constructor(message?: string, options?: AppErrorOptions) {
    super(
      message ?? "Sorry! An unexpected error has occurred with the webapp.",
      options,
    );
    this.name = new.target.name;
    this.code = options?.code ?? "APP_ERROR";
    this.status = options?.status ?? 555;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type ErrorConstructor<T extends Error = Error> = abstract new (
  ...args: never[]
) => T;

export async function catchError<
  T,
  const E extends readonly ErrorConstructor<AppError>[],
>(
  promise: Promise<T>,
  catchErrorTypes: E,
): Promise<[undefined, T] | [InstanceType<E[number]>]> {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      if (catchErrorTypes.some((e) => error instanceof e)) {
        return [error as InstanceType<E[number]>];
      }

      throw error;
    });
}

export function formatErrorMessage<T extends AppError>(error: T): ErrorMessage {
  return {
    status: error.status,
    message: error.message,
  };
}
