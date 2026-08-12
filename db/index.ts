import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is not configured");
  client ??= postgres(process.env.POSTGRES_URL, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export function isDatabaseConfigured() {
  return Boolean(process.env.POSTGRES_URL);
}
