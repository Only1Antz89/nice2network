import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public and in-app help requests feed a private admin support inbox", async () => {
  const [signin, helpPage, helpPanel, form, route, adminRoute, action, consoleUi, schema, email] = await Promise.all([
    read("app/signin/page.tsx"), read("app/help/page.tsx"), read("components/help-panel.tsx"), read("components/support-request-form.tsx"),
    read("app/api/support/route.ts"), read("app/api/admin/support/route.ts"), read("app/api/admin/support/[requestId]/route.ts"),
    read("app/admin/admin-console.tsx"), read("db/schema.ts"), read("lib/email.ts"),
  ]);
  assert.match(signin, /href="\/help">Need help\?/);
  assert.match(helpPage, /SupportRequestForm/);
  assert.match(helpPanel, /SupportRequestForm compact/);
  assert.match(form, /account_access/);
  assert.match(form, /maxLength=\{2000\}/);
  assert.match(route, /enforceDistributedRateLimit/);
  assert.match(route, /requesterId = session\?\.user\?\.id \|\| null/);
  assert.match(adminRoute, /requirePermission\("members\.support"\)/);
  assert.match(action, /sendSupportResolutionEmail/);
  assert.match(action, /request remains open for retry/);
  assert.match(consoleUi, /Support inbox/);
  assert.match(consoleUi, /Resolve and email/);
  assert.match(schema, /supportRequests = pgTable\("support_requests"/);
  assert.match(email, /sendSupportResolutionEmail/);
});
