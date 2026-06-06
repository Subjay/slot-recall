import {
  PasswordChangeInput,
  SignInInput,
  SignUpInput,
} from "@dto/user/authentication";
import { auth } from "./instance";
import { headers } from "next/headers";

export async function signUpUser(user: SignUpInput) {
  return await auth.api.signUpEmail({
    body: {
      name: user.displayName?.trim() || user.username,
      email: user.email,
      password: user.password,
      username: user.username,
      displayUsername: user.displayName?.trim() || user.username,
    },
  });
}

export async function signInUser(input: SignInInput) {
  if ("email" in input) {
    return await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
    });
  }

  return await auth.api.signInUsername({
    body: {
      username: input.username,
      password: input.password,
    },
  });
}

export async function signOutUser() {
  return await auth.api.signOut({
    headers: await headers(),
  });
}

export async function updateUserPassword({
  newPassword,
  currentPassword,
}: PasswordChangeInput) {
  return await auth.api.changePassword({
    body: {
      newPassword,
      currentPassword,
      revokeOtherSessions: true,
    },
    headers: await headers(),
  });
}
