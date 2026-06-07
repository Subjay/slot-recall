import {
  getMissingServerConfig,
  missingServerConfigResponse,
} from "@/lib/api/config";
import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const missingConfig = getMissingServerConfig(["DATABASE_URL"]);

  if (missingConfig.length > 0) {
    return missingServerConfigResponse(missingConfig);
  }

  const [{ default: database }, { call }, { client }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/db/schemas/call"),
    import("@/lib/db/schemas/client"),
  ]);

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
