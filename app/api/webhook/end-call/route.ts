import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("************");
  console.log("************");
  console.log("Fonio webhook received:", body);
  console.log("************");
  console.log("************");

  return Response.json({ success: true });
}
