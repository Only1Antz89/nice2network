import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export function isPrivateRemoteAddress(address: string) {
  const normalized = address.replace(/^::ffff:/, "").toLowerCase();
  if (["::", "::1", "0.0.0.0", "255.255.255.255"].includes(normalized)) return true;
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  return /^(fc|fd|fe8|fe9|fea|feb)/i.test(normalized) || normalized.startsWith("ff");
}

export async function safeRemoteTarget(value: string) {
  const url = new URL(value);
  if (!/^(https?):$/.test(url.protocol) || url.username || url.password) throw new Error("Unsupported URL");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) throw new Error("Private URL");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateRemoteAddress(address))) throw new Error("Private URL");
  return { url, ...addresses[0] };
}

export async function requestRemoteResource(value: string, options: {
  accept: string;
  maxBytes: number;
  timeoutMs?: number;
}) {
  const target = await safeRemoteTarget(value);
  return new Promise<{ status: number; location?: string; contentType: string; body: Buffer }>((resolve, reject) => {
    const send = target.url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(target.url, {
      headers: { accept: options.accept, "user-agent": "nice2network-link-preview/1.0" },
      lookup: (_hostname, lookupOptions, callback) => {
        const address = { address: target.address, family: target.family };
        if (typeof lookupOptions === "object" && lookupOptions.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxBytes) response.destroy(new Error("Remote resource too large"));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve({
        status: response.statusCode ?? 500,
        location: response.headers.location,
        contentType: response.headers["content-type"] ?? "",
        body: Buffer.concat(chunks),
      }));
      response.on("error", reject);
    });
    req.setTimeout(options.timeoutMs ?? 5_000, () => req.destroy(new Error("Remote request timed out")));
    req.on("error", reject);
    req.end();
  });
}
