import { queryReservationsBetweenDates } from "@/lib/services/reservation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { start, end } = await req.json();

  const reservations = await queryReservationsBetweenDates(
    new Date(start),
    new Date(end),
  );

  return NextResponse.json({ data: reservations });
}
