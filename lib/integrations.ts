import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrationAccounts } from "@/db/schema";

export type IntegrationProvider = "google" | "microsoft";

function key() {
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) throw new Error("INTEGRATION_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(process.env.INTEGRATION_ENCRYPTION_KEY).digest();
}

export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(value: string) {
  const [iv, tag, body] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function oauthConfig(provider: IntegrationProvider) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  if (provider === "google") return { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "openid email profile https://www.googleapis.com/auth/calendar.events", redirect: `${base}/api/integrations/google/callback` };
  return { clientId: process.env.MICROSOFT_CLIENT_ID!, clientSecret: process.env.MICROSOFT_CLIENT_SECRET!, authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token: "https://login.microsoftonline.com/common/oauth2/v2.0/token", scope: "openid profile email offline_access User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite", redirect: `${base}/api/integrations/microsoft/callback` };
}

export async function usableAccessToken(userId: string, provider: IntegrationProvider) {
  const [account] = await getDb().select().from(integrationAccounts).where(and(eq(integrationAccounts.userId, userId), eq(integrationAccounts.provider, provider))).limit(1);
  if (!account) throw new Error(`Connect ${provider} first`);
  if (!account.expiresAt || account.expiresAt.getTime() > Date.now() + 60_000) return decrypt(account.accessTokenEncrypted);
  if (!account.refreshTokenEncrypted) throw new Error(`Reconnect ${provider}`);
  const config = oauthConfig(provider);
  const response = await fetch(config.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: decrypt(account.refreshTokenEncrypted), ...(provider === "microsoft" ? { scope: config.scope } : {}) }) });
  if (!response.ok) throw new Error(`Could not refresh ${provider}`);
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
  await getDb().update(integrationAccounts).set({ accessTokenEncrypted: encrypt(token.access_token), refreshTokenEncrypted: token.refresh_token ? encrypt(token.refresh_token) : account.refreshTokenEncrypted, expiresAt: new Date(Date.now() + token.expires_in * 1000), updatedAt: new Date() }).where(eq(integrationAccounts.id, account.id));
  return token.access_token;
}
