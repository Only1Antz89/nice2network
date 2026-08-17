import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("applies browser security headers and cross-site write protection", async () => {
  const [config, proxy] = await Promise.all([read("next.config.ts"), read("proxy.ts")]);
  for (const directive of ["Content-Security-Policy", "frame-ancestors 'none'", "X-Content-Type-Options", "Permissions-Policy", "Strict-Transport-Security"]) assert.match(config, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(proxy, /SAFE_METHODS/);
  assert.match(proxy, /sec-fetch-site/);
  assert.match(proxy, /MAX_API_BODY_BYTES/);
  assert.match(proxy, /new URL\(origin\)\.origin !== new URL\(configured\)\.origin/);
});

test("pins link preview requests to a validated public DNS result", async () => {
  const route = await read("app/api/link-preview/route.ts");
  assert.match(route, /requireMember/);
  assert.match(route, /addresses\.some\(\(\{ address \}\) => isPrivateAddress\(address\)\)/);
  assert.match(route, /options\.all\) callback\(null, \[address\]\)/);
  assert.match(route, /callback\(null, address\.address, address\.family\)/);
  assert.match(route, /MAX_HTML_BYTES/);
});

test("revokes JWT access after password or account status changes", async () => {
  const [auth, reset] = await Promise.all([read("auth.ts"), read("app/api/auth/password/reset/route.ts")]);
  assert.match(auth, /authVersion/);
  assert.match(auth, /member\?\.status === "active"/);
  assert.match(auth, /if \(!token\.authValid\) token\.userId = undefined/);
  assert.match(reset, /delete\(verificationTokens\).*returning/);
  assert.match(reset, /db\.transaction/);
});

test("enforces connection-scoped direct content access and safe attachment schemes", async () => {
  const [access, thread, updates] = await Promise.all([
    read("lib/content-access.ts"),
    read("app/api/posts/[postId]/thread/route.ts"),
    read("app/api/projects/[projectId]/updates/route.ts"),
  ]);
  assert.match(access, /areMutualConnections/);
  assert.match(access, /requireProjectView/);
  assert.match(access, /requirePostView/);
  assert.match(thread, /requirePostView/);
  assert.match(updates, /requireProjectView/);
  assert.match(updates, /data:application\\\/\(pdf\|zip\);base64/);
});
