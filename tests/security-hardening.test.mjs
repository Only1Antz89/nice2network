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

test("development CSP supports Next hydration without weakening production", async () => {
  const config = await read("next.config.ts");
  assert.match(config, /NODE_ENV === "development"[\s\S]*?'unsafe-eval'/);
  assert.doesNotMatch(config, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
});

test("pins link preview requests to a validated public DNS result", async () => {
  const route = await read("app/api/link-preview/route.ts");
  const imageRoute = await read("app/api/link-preview/image/route.ts");
  const remoteHttp = await read("lib/safe-remote-http.ts");
  assert.match(route, /requireMember/);
  assert.match(imageRoute, /requireMember/);
  assert.match(remoteHttp, /addresses\.some\(\(\{ address \}\) => isPrivateRemoteAddress\(address\)\)/);
  assert.match(remoteHttp, /lookupOptions\.all\) callback\(null, \[address\]\)/);
  assert.match(remoteHttp, /callback\(null, address\.address, address\.family\)/);
  assert.match(route, /MAX_HTML_BYTES/);
  assert.match(imageRoute, /MAX_IMAGE_BYTES/);
  assert.match(imageRoute, /ALLOWED_IMAGE_TYPES/);
  assert.match(imageRoute, /x-content-type-options/);
});

test("rich link previews proxy and progressively render social images", async () => {
  const route = await read("app/api/link-preview/route.ts");
  const page = await read("app/page.tsx");
  const css = await read("app/globals.css");
  assert.match(route, /\/api\/link-preview\/image\?url=/);
  assert.match(route, /og:image:secure_url/);
  assert.match(page, /loading="lazy"/);
  assert.match(page, /imageAlt/);
  assert.match(page, /link-preview\?v=2&url=/);
  assert.match(css, /aspect-ratio:1\.91\/1/);
});

test("revokes JWT access after password or account status changes", async () => {
  const [auth, reset] = await Promise.all([read("auth.ts"), read("app/api/auth/password/reset/route.ts")]);
  assert.match(auth, /authVersion/);
  assert.doesNotMatch(auth, /return \{ id: member\.id, email: member\.email, name: member\.name, image: member\.image \}/);
  assert.match(auth, /token\.picture = undefined/);
  assert.match(auth, /member\?\.status === "active"/);
  assert.match(auth, /if \(!token\.authValid\) token\.userId = undefined/);
  assert.match(reset, /delete\(verificationTokens\).*returning/);
  assert.match(reset, /db\.transaction/);
});

test("distributed sign-in rate limiting keeps Date objects out of raw SQL", async () => {
  const source = await read("lib/distributed-rate-limit.ts");
  assert.match(source, /resetAt: sql`case when .* <= now\(\) then now\(\) \+ \(\$\{windowMs\} \* interval '1 millisecond'\)/s);
  assert.match(source, /updatedAt: sql`now\(\)`/);
  assert.doesNotMatch(source, /sql`[^`]*\$\{now\}/);
  assert.doesNotMatch(source, /sql`[^`]*\$\{resetAt\}/);
});

test("credential rate limits return a safe auth response instead of an HTML 500", async () => {
  const [auth, signin] = await Promise.all([
    read("auth.ts"),
    read("app/signin/page.tsx"),
  ]);
  assert.match(auth, /class SignInRateLimited extends CredentialsSignin/);
  assert.match(auth, /error instanceof RateLimitError/);
  assert.match(signin, /from "next-auth\/react"/);
  assert.match(signin, /await signIn\("credentials"/);
  assert.match(signin, /result\.code==="rate_limit"/);
  assert.match(signin, /catch \{/);
  assert.match(signin, /finally \{\s*setBusy\(false\)/);
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
