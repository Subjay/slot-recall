import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@auth/server/instance";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export const config = {
  matcher: ["/<custom-url>/:path*"],
};
