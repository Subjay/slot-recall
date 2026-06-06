"use client";

import { authClient } from "@auth/client/instance";
import { toDtoSession, type SessionDTO } from "@dto/session/output";

type UseAuthClientSessionResult = ReturnType<typeof authClient.useSession>;
type UseSessionResult = Omit<UseAuthClientSessionResult, "data"> & {
  data: SessionDTO | null | undefined;
};

export function useSession(): UseSessionResult {
  const session = authClient.useSession();

  return {
    ...session,
    data: session.data ? toDtoSession(session.data) : session.data,
  };
}
