export type AtLeastOne<T> = {
  [K in keyof T]: Required<{ [P in K]-?: Exclude<T[P], undefined> }> &
    Partial<T>;
}[keyof T];

export type ActionState<T> =
  | {
      error: false;
      data?: T;
    }
  | {
      error: true;
      messages?: string | Record<string, string[] | undefined>;
    };
