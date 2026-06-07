import { NextResponse } from "next/server";

export function getMissingServerConfig(keys: string[]) {
  return keys.filter((key) => !process.env[key]);
}

export function missingServerConfigResponse(keys: string[]) {
  return NextResponse.json(
    {
      success: false,
      error: `Missing server configuration: ${keys.join(", ")}`,
    },
    { status: 503 },
  );
}
