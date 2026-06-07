import { NextRequest, NextResponse } from "next/server";
import { startOutboundCall } from "@/app/_lib/slot-recall";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const call = await startOutboundCall(body);
    return NextResponse.json({ call, success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start call.",
        success: false,
      },
      { status: 500 },
    );
  }
}
