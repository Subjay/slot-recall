import { NextRequest, NextResponse } from "next/server";

import { getReservationCallContext } from "@/lib/services/call";
import { generateRankingList } from "@/lib/services/raking";
import { findWaitingClients } from "@/lib/services/waiting-client";
import { ReservationRecord } from "@/lib/dal/reservation/types";

type CancellationContext = {
  date: Date | string;
  location: string;
  doctor: string;
  doctor_phone: string;
};

export async function POST(req: NextRequest) {
  const { reservation }: { reservation?: ReservationRecord } = await req.json();

  if (!reservation) {
    return NextResponse.json(
      { success: false, error: "Missing reservation payload." },
      { status: 400 },
    );
  }

  const reservationContext = await getReservationCallContext(reservation.id);
  const context: CancellationContext | null = reservationContext
    ? {
        date: reservationContext.date,
        location: `${reservationContext.locationAddress}, ${reservationContext.locationCity}`,
        doctor: `${reservationContext.doctorFirstName} ${reservationContext.doctorLastName}`,
        doctor_phone: reservationContext.doctorPhone,
      }
    : null;

  if (!context) {
    return NextResponse.json(
      { success: false, error: "Missing cancellation context." },
      { status: 400 },
    );
  }

  const waitingClients = await findWaitingClients();
  const rankedClients = generateRankingList(waitingClients);
  const callUrl = new URL("/api/call", req.nextUrl.origin);
  const waitingClient = rankedClients[0];

  if (!waitingClient) {
    return NextResponse.json({ success: true, calls: [] });
  }

  const call = await fetch(callUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      toNumber: waitingClient.client.phoneNumber,
      first_name: waitingClient.client.firstName,
      last_name: waitingClient.client.lastName,
      date: context.date,
      location: context.location,
      doctor: context.doctor,
      doctor_phone: context.doctor_phone,
      reservation_id: reservation.id,
    }),
  });

  return NextResponse.json({
    success: true,
    calls: [
      {
        waitingClientId: waitingClient.id,
        status: call.ok ? "fulfilled" : "rejected",
      },
    ],
  });
}
