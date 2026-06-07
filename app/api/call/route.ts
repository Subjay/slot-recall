import { NextRequest, NextResponse } from "next/server";

import { addCall } from "@/lib/services/call";
import { findClient } from "@/lib/services/client";

export async function POST(req: NextRequest) {
  const {
    toNumber,
    first_name,
    last_name,
    date: bookingDate,
    location,
    doctor,
    doctor_phone,
  } = await req.json();
  const date = new Date(bookingDate);

  const client = await findClient({ phoneNumber: toNumber });

  if (!client) {
    return NextResponse.json(
      { success: false, error: "Client not found." },
      { status: 404 },
    );
  }

  const call = await addCall({
    clientId: client.id,
    status: "started",
    answer: false,
    reason: null,
  });

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
        toNumber,
        agentId: process.env.AGENT_ID!,
        context: {
          call_id: call.id,
          client_id: client.id,
          doctor,
          doctor_phone,
          first_name,
          last_name,
          date: date.toLocaleDateString("en-EN", {
            day: "numeric",
            month: "long",
            year: "2-digit",
          }),
          location,
        },
      }),
    },
  );

  const data = await response.json();

  return NextResponse.json({ data, success: true });
}
