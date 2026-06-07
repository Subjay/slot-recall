import { NextResponse } from "next/server";
import { getDashboardState } from "@/app/_lib/slot-recall";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardState());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load dashboard.",
      },
      { status: 500 },
    );
  }
}
