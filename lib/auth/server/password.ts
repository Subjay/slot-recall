import { argon2id, hash, type Options, verify } from "argon2";

if (!process.env.ARGON2_SECRET) {
  throw new Error("ARGON2_SECRET must be set in .env file.");
}

export const ARGON2_OPTIONS: Options = {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  secret: Buffer.from(process.env.ARGON2_SECRET, "utf8"),
};

export async function hashPassword(password: string) {
  return await hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(data: { password: string; hash: string }) {
  const { password, hash: passwordHash } = data;

  return await verify(passwordHash, password, ARGON2_OPTIONS);
}
