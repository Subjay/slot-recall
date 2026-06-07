import { getMetrics } from "@/lib/services/raking";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: await getMetrics() });
}
