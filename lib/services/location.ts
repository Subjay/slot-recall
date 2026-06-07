import { getLocations } from "@/lib/dal/location/queries";
import type { LocationRecord } from "@/lib/dal/location/types";

export async function queryAllLocations(): Promise<LocationRecord[]> {
  return getLocations();
}
