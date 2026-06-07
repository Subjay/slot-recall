import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { updateCall } from "@/lib/dal/call/mutations";
import database from "@/lib/db";
import { reservation } from "@/lib/db/schemas/reservation";
import { waitingClient } from "@/lib/db/schemas/waiting-client";
import { generateRankingList } from "@/lib/services/raking";
import { findWaitingClients } from "@/lib/services/waiting-client";

type EndCallContext = {
  client_id: string;
  call_id?: string;
  date?: string;
  location?: string;
  doctor?: string;
  doctor_phone?: string;
  reservation_id?: string;
};

type ExtractionData = {
  answer?: string;
  reason?: string | null;
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log(body, "************");

  const { answer, reason }: ExtractionData = body.extractionData;
  const {
    client_id,
    call_id,
    date,
    location,
    doctor,
    doctor_phone,
    reservation_id,
  }: EndCallContext = body.context;

  if (!call_id || !date) {
    return Response.json(
      { success: false, error: "Missing call " },
      { status: 400 },
    );
  }

  const isNoAnswer =
    answer === null || answer === undefined || answer.toLowerCase() === "no";

  await updateCall({
    id: call_id,
    status: "ended",
    answer: answer?.toLowerCase() === "yes" ? true : false,
    reason: reason ?? null,
  });

  await database
    .update(waitingClient)
    .set({ status: "resolved" })
    .where(eq(waitingClient.clientId, client_id));

  if (!isNoAnswer && reservation_id) {
    await database
      .update(reservation)
      .set({ status: "rebooked" })
      .where(eq(reservation.id, reservation_id));
  }

  const rankedClients = generateRankingList(await findWaitingClients());
  const nextClient = rankedClients[0];

  if (!nextClient) {
    return Response.json({ success: true, calls: [] });
  }

  const { firstName, lastName } = nextClient.client;

  const response = await fetch(
    "https://app.fonio.ai/api/public/v1/outbound_call",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FONIO_API_KEY!}`,
      },
      body: JSON.stringify({
        apiKey: process.env.FONIO_API_KEY!,
        fromNumber: process.env.OUTBOUND_NUMBER!,
        toNumber: body.toNumber,
        agentId: process.env.AGENT_ID!,
        context: {
          call_id: call_id,
          client_id: nextClient.clientId,
          doctor,
          doctor_phone,
          first_name: firstName,
          last_name: lastName,
          date: new Date(date).toLocaleDateString("en-EN", {
            day: "numeric",
            month: "long",
            year: "2-digit",
          }),
          location,
        },
      }),
    },
  );

  return Response.json({
    success: true,
    calls: [
      {
        waitingClientId: nextClient.id,
        status: response.ok ? "fulfilled" : "rejected",
      },
    ],
  });
}
