import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function createTotpSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) output += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return output;
}

function decodeBase32(value: string) {
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, counter: number) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(value % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((offset) => timingSafeEqual(Buffer.from(totp(secret, counter + offset)), Buffer.from(code)));
}

function signingKey() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured");
  return process.env.AUTH_SECRET;
}

export function createAdminCookie(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminCookie(value: string, userId: string) {
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", signingKey()).update(payload).digest("base64url");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string; expiresAt: number };
    return parsed.userId === userId && parsed.expiresAt > Date.now();
  } catch { return false; }
}
