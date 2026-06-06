import { AppError } from "./errors";

export function switchItemsInArray(array: unknown[], x: number, y: number) {
  if (x >= array.length || y >= array.length) {
    throw new AppError(`Given index are out of bound.`);
  }

  [array[x], array[y]] = [array[y], array[x]];
}
