import { NextRequest, NextResponse } from "next/server";

import {
  getMissingServerConfig,
  missingServerConfigResponse,
} from "@/lib/api/config";

export async function POST(req: NextRequest) {
  const missingConfig = getMissingServerConfig([
    "DATABASE_URL",
    "FONIO_API_KEY",
    "OUTBOUND_NUMBER",
    "AGENT_ID",
  ]);

  if (missingConfig.length > 0) {
    return missingServerConfigResponse(missingConfig);
  }

  const [{ addCall }, { findClient }] = await Promise.all([
    import("@/lib/services/call"),
    import("@/lib/services/client"),
  ]);
  const {
    toNumber,
    first_name,
    last_name,
    date: bookingDate,
    location,
    doctor,
    doctor_phone,
    reservation_id,
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
          reservation_id,
        },
      }),
    },
  );

  const data = await response.json();

  return NextResponse.json({ data, success: true });
}
