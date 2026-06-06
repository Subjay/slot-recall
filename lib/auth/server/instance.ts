import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import db from "@db/index";
import { account } from "@db/schemas/account";
import { rateLimit } from "@db/schemas/rate-limit";
import { session } from "@db/schemas/session";
import { user } from "@db/schemas/user";
import { verification } from "@db/schemas/verification";
import { buildUniqueUsername } from "@dto/user/helpers";
import { accessControl } from "../shared/permissions";
import { authRoles, ROLES } from "../shared/roles";
import { hashPassword, verifyPassword } from "./password";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      cv_users: user,
      cv_accounts: account,
      cv_sessions: session,
      cv_verifications: verification,
      cv_rate_limits: rateLimit,
    },
  }),
  user: {
    modelName: "cv_users",
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
      },
      displayUsername: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        input: false,
      },
      banned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      banReason: {
        type: "string",
        required: false,
        input: false,
      },
      banExpires: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  account: {
    modelName: "cv_accounts",
  },
  session: {
    modelName: "cv_sessions",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 15,
  },
  verification: {
    modelName: "cv_verifications",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account consent",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
    },
    // facebook: {
    //   clientId: process.env.FACEBOOK_CLIENT_ID as string,
    //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    // },
  },
  disabledPaths: ["/is-username-available"],
  databaseHooks: {
    user: {
      create: {
        before: async (
          authUser: {
            id?: string;
            createdAt?: Date;
            updatedAt?: Date;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null;
            username?: string;
            displayUsername?: string;
            [key: string]: unknown;
          },
          _context,
        ) => {
          if (authUser.username) {
            return;
          }

          const username = buildUniqueUsername(authUser.name);

          return {
            data: {
              ...authUser,
              username,
            },
          };
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 5,
      maxUsernameLength: 40,
      usernameValidator: (username) => {
        if (
          username.toLowerCase() === "admin" ||
          username.toLowerCase() === "superadmin" ||
          username.toLowerCase() === "root"
        ) {
          return false;
        }

        return /^[a-zA-Z0-9._-]+$/.test(username);
      },
      usernameNormalization: (username) => username.toLowerCase(),
      displayUsernameValidator: (displayUsername) => {
        if (
          displayUsername.toLowerCase() === "admin" ||
          displayUsername.toLowerCase() === "superadmin" ||
          displayUsername.toLowerCase() === "root"
        ) {
          return false;
        }

        return /^[a-zA-Z0-9._-]+$/.test(displayUsername);
      },
    }),
    adminPlugin({
      defaultRole: ROLES.USER,
      accessControl,
      roles: authRoles,
    }),
    nextCookies(),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    ipAddress: {
      ipAddressHeaders: [
        "x-forwarded-for",
        "x-real-ip",
        "x-vercel-forwarded-for",
      ],
    },
    cookiePrefix:
      process.env.NODE_ENV !== "production" ? "better-auth" : "__Host-",
  },
  rateLimit: {
    window: 600,
    max: 10,
    storage: "database",
    modelName: "cv_rate_limits",
  },
});
