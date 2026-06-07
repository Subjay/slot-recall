import { setReservation } from "@/lib/services/reservation";
import type { ReservationUpdate } from "@/lib/dal/reservation/types";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: ReservationUpdate["id"];
  }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reservation: ReservationUpdate = await req.json();
  const updatedReservation = await setReservation({ ...reservation, id });

  if (updatedReservation.status === "cancelled") {
    await fetch(new URL("/api/webhook/cancellation", req.nextUrl.origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reservation: updatedReservation }),
    });
  }

  return NextResponse.json({ data: updatedReservation });
}
