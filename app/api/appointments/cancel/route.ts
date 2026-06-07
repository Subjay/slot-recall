import { NextRequest, NextResponse } from "next/server";
import { cancelAppointments } from "@/app/_lib/slot-recall";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No appointment ids provided." }, { status: 400 });
    }

    return NextResponse.json(await cancelAppointments(ids));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel appointments.",
      },
      { status: 500 },
    );
  }
}
