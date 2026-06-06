import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";
import { accessControl } from "../shared/permissions";
import { authRoles } from "../shared/roles";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({
      ac: accessControl,
      roles: authRoles,
    }),
  ],
});
