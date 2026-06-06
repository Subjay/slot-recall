import db from "@db/index";
import { user } from "@db/schemas/user";
import { AppError } from "@utils/errors";
import { normalize_string, trim_spaces } from "@utils/string";
import { eq } from "drizzle-orm";

export function sanitizeUsername(value: string) {
  return normalize_string(value)
    .replace(/\s+/g, ".")
    .replace(/[^a-zA-Z0-9._-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");
}

export async function buildUsernameFromEmail(email: string) {
  const baseUsername = email?.split("@")[0];

  if (baseUsername.length === 0) {
    throw new AppError("Email local part not found.");
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomUUID();
    const candidate = `${baseUsername}#${suffix}`;
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1);

    if (!existingUser) {
      return candidate;
    }
  }

  return `${baseUsername}#${crypto.randomUUID()}`;
}

export function buildUniqueUsername(seed: string) {
  const baseUsername = sanitizeUsername(trim_spaces(seed));

  return `${baseUsername}#${crypto.randomUUID()}`;
}
