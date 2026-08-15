import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public preview avoids configuration errors for read-only discovery", async () => {
  const [auth, notices, pulse, posts, projects] = await Promise.all([
    read("auth.ts"),
    read("app/api/notices/route.ts"),
    read("app/api/network-pulse/route.ts"),
    read("app/api/posts/route.ts"),
    read("app/api/projects/route.ts"),
  ]);

  assert.match(auth, /!isDatabaseConfigured\(\) \? "nice-2-network-unconfigured-preview"/);
  assert.match(notices, /!isDatabaseConfigured\(\).*\{ notices: \[\] \}/);
  assert.match(pulse, /!isDatabaseConfigured\(\).*\{ slides: \[\] \}/);
  assert.match(posts, /!isDatabaseConfigured\(\).*\{ posts: \[\] \}/);
  assert.match(projects, /!isDatabaseConfigured\(\).*algorithmMode: "public"/);
});

test("unconfigured writes return an actionable service response", async () => {
  const api = await read("lib/api.ts");
  assert.match(api, /POSTGRES_URL is not configured/);
  assert.match(api, /public preview mode/);
  assert.match(api, /status: 503/);
});

test("interactive feed controls use native semantics and controlled summaries", async () => {
  const [page, guestAuth] = await Promise.all([
    read("app/page.tsx"),
    read("components/guest-auth-prompt.tsx"),
  ]);
  assert.match(page, /<button\s+type="button"\s+className="post-thread-trigger"/);
  assert.match(page, /<strong>\{meetTitle \|\| "Untitled meet"\}<\/strong>/);
  assert.doesNotMatch(page, /meetFormRef\.current\?\.elements\.namedItem\("title"\)/);
  assert.match(guestAuth, /aria-label="Close account dialog"/);
  assert.match(page, /authenticated \? "Filters" : "Join to filter"/);
});
