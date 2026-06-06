import { authClient } from "@auth/client/instance";
import { auth } from "@auth/server/instance";
import { ROLES } from "@auth/shared/roles";
import { randomUUID } from "node:crypto";

type BetterAuthSession = typeof auth.$Infer.Session;
type BetterAuthClientSession = typeof authClient.$Infer.Session;
type BetterAuthUser = BetterAuthSession["user"];

export type AdminSessionDTO = UserSessionDTO & {
  user: BetterAuthUser;
};

export type UserSessionDTO = {
  user: Pick<BetterAuthUser, "id" | "role" | "displayUsername">;
  role: string | null | undefined;
};

export type SessionDTO = AdminSessionDTO | UserSessionDTO | null;

export function toDtoSession(
  session: BetterAuthSession | BetterAuthClientSession,
): SessionDTO {
  switch (session.user.role) {
    case ROLES.ADMIN:
      return {
        user: {
          ...session.user,
        },
        role: session.user.role,
      };
    case ROLES.USER:
      return {
        user: {
          id: session.user.id,
          displayUsername: session.user.displayUsername,
        },
        role: session.user.role,
      };
    default:
      return {
        user: {
          id: `guest_${randomUUID()}`,
          displayUsername: "Guest User",
        },
        role: ROLES.GUEST,
      };
  }
}
