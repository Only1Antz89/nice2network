import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profiles expose a right-aligned share action and stable public share path", async () => {
  const [page, styles, shareSheet] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("components/share-sheet.tsx"),
  ]);
  assert.match(page, /className="profile-share-button"/);
  assert.match(page, /sharePath: `\/\$\{profile\.username\}`/);
  assert.match(styles, /profile-share-button\{margin-left:auto/);
  assert.match(shareSheet, /item\.sharePath \?\?/);
  assert.match(shareSheet, /kind\?: "project" \| "post" \| "profile"/);
});

test("shared private profiles support authenticated follow requests and decisions", async () => {
  const [schema, sharedProfile, requestRoute, decisionRoute, action] = await Promise.all([
    read("db/schema.ts"),
    read("app/[username]/page.tsx"),
    read("app/api/users/[userId]/follow-request/route.ts"),
    read("app/api/follow-requests/[requestId]/route.ts"),
    read("components/public-profile-actions.tsx"),
  ]);
  assert.match(schema, /export const followRequests = pgTable\("follow_requests"/);
  assert.match(sharedProfile, /This profile is private/);
  assert.match(sharedProfile, /kind=\{restricted \? "request" : "follow"\}/);
  assert.match(requestRoute, /requireMember\(\)/);
  assert.match(requestRoute, /requested to follow you/);
  assert.match(decisionRoute, /decision: z\.enum\(\["accepted", "declined"\]\)/);
  assert.match(decisionRoute, /insert\(follows\)/);
  assert.match(action, /GuestAuthPrompt/);
  assert.match(action, /Request to follow/);
});

test("share actions are compact and external apps use local brand marks", async () => {
  const [styles, shareSheet, brandStyles] = await Promise.all([
    read("app/globals.css"),
    read("components/share-sheet.tsx"),
    read("components/share-sheet.module.css"),
  ]);
  assert.match(styles, /min-height:62px/);
  assert.match(styles, /grid-template-columns:22px minmax\(0,1fr\)/);
  for (const brand of ["whatsapp", "linkedin", "facebook", "x", "telegram", "email"]) {
    assert.match(shareSheet, new RegExp(`SocialBrandIcon brand="${brand}"`));
    assert.match(brandStyles, new RegExp(`\\.${brand} \\{`));
  }
  assert.doesNotMatch(brandStyles, /cdn\.simpleicons\.org/);
});
