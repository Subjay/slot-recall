import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schemaDefinitons } from "./schemas";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL env variable couldn't be found.");
}

const createClient = () =>
  postgres(connectionString, {
    max: 10,
    prepare: false,
  });

type DatabaseClient = ReturnType<typeof createClient>;

declare global {
  var __dbClient__: DatabaseClient | undefined;
}

const client = globalThis.__dbClient__ ?? createClient();

if (!globalThis.__dbClient__) {
  globalThis.__dbClient__ = client;
}

const db = drizzle(client, {
  casing: "snake_case",
  schema: { ...schemaDefinitons },
  logger: process.env.NODE_ENV !== "production",
});

export type Database = typeof db;
export default db;
