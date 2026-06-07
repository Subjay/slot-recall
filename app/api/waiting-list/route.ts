import { findWaitingClients } from "@/lib/services/waiting-client";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: await findWaitingClients() });
}
