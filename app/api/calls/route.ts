import database from "@/lib/db";
import { call } from "@/lib/db/schemas/call";
import { client } from "@/lib/db/schemas/client";
import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const calls = await database
    .select({
      id: call.id,
      clientId: call.clientId,
      status: call.status,
      answer: call.answer,
      reason: call.reason,
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
    })
    .from(call)
    .innerJoin(client, eq(call.clientId, client.id))
    .orderBy(asc(call.status), desc(call.id));

  return NextResponse.json({
    data: calls,
  });
}
