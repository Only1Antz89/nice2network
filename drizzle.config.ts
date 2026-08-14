import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder" },
});
