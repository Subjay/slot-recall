import { NextRequest } from "next/server";
import { handleEndCallWebhook } from "@/app/_lib/slot-recall";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await handleEndCallWebhook(body);
    return Response.json({ result, success: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Webhook handling failed.",
        success: false,
      },
      { status: 500 },
    );
  }
}
