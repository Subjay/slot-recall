import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@auth/server/instance";
import { SessionDTO, toDtoSession } from "@dto/session/output";
import { catchAuthError, UnauthenticatedError } from "@auth/shared/errors";

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
export type RawSession = NonNullable<BetterAuthSession>;

export async function getSession(): Promise<SessionDTO> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session === null) {
    throw new UnauthenticatedError();
  }

  return toDtoSession(session);
}

export async function requireSession(redirectTo = "/login") {
  const [error, session] = await catchAuthError(getSession());

  if (error || !session) {
    redirect(redirectTo);
  }

  return session;
}

export async function redirectIfLogged(redirectTo = "/dashboard") {
  const [_error, session] = await catchAuthError(getSession());

  if (session) {
    redirect(redirectTo);
  }
}
