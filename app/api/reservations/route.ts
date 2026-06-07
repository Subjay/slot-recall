import {
  getMissingServerConfig,
  missingServerConfigResponse,
} from "@/lib/api/config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const missingConfig = getMissingServerConfig(["DATABASE_URL"]);

  if (missingConfig.length > 0) {
    return missingServerConfigResponse(missingConfig);
  }

  const { queryReservationsBetweenDates } = await import(
    "@/lib/services/reservation"
  );
  const { start, end } = await req.json();

  const reservations = await queryReservationsBetweenDates(
    new Date(start),
    new Date(end),
  );

  return NextResponse.json({ data: reservations });
}
