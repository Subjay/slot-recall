import {
  getMissingServerConfig,
  missingServerConfigResponse,
} from "@/lib/api/config";
import { NextResponse } from "next/server";

export async function GET() {
  const missingConfig = getMissingServerConfig(["DATABASE_URL"]);

  if (missingConfig.length > 0) {
    return missingServerConfigResponse(missingConfig);
  }

  const { findWaitingClients } = await import("@/lib/services/waiting-client");

  return NextResponse.json({ data: await findWaitingClients() });
}
