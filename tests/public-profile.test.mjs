import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isAvailableUsernameFormat, usernameBase } from "../lib/usernames.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("usernames are stable, URL-safe and avoid application routes", () => {
  assert.equal(usernameBase("anthony"), "anthony");
  assert.equal(usernameBase("Anthony.Osei"), "anthonyosei");
  assert.equal(usernameBase("signin"), "signin-n2");
  assert.match(usernameBase("É J"), /^member-/);
  assert.equal(isAvailableUsernameFormat("anthony_osei"), true);
  assert.equal(isAvailableUsernameFormat("signin"), false);
  assert.equal(isAvailableUsernameFormat("Blue.Box"), false);
});

test("members can see and safely change their public-profile username", async () => {
  const [settings, profileApi, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/profiles/[userId]/route.ts"),
    read("app/globals.css"),
  ]);
  assert.match(profileApi, /username: users\.username/);
  assert.match(profileApi, /That username is already taken/);
  assert.match(profileApi, /publicProfilePath: `\/\$\{username\}`/);
  assert.match(settings, />\s*Username\s*</);
  assert.match(settings, /Public address:/);
  assert.match(settings, /Set profile visibility to Public before sharing/);
  assert.match(settings, /className="profile-username"/);
  assert.match(settings, /profile\.visibility === "public" && !profile\.isCurrent/);
  assert.match(styles, /\.username-field/);
});

test("the guest entry journey is sign-in first with an explicit preview choice", async () => {
  const [home, prompt] = await Promise.all([read("app/page.tsx"), read("components/guest-auth-prompt.tsx")]);
  assert.match(home, /setGuestAuthMode\("signin"\)/);
  assert.match(home, /n2-guest-peeked/);
  assert.match(prompt, /initialMode = "signin"/);
  assert.match(prompt, /Take a peek first/);
  assert.match(prompt, /Create account/);
});

test("username pages expose content only for public profiles", async () => {
  const [page, schema, migration] = await Promise.all([
    read("app/[username]/page.tsx"),
    read("db/schema.ts"),
    read("drizzle/0026_clammy_warpath.sql"),
  ]);
  assert.match(schema, /username:\s*text\("username"\)\.notNull\(\)/);
  assert.match(page, /profile\.visibility !== "public"/);
  assert.match(page, /restricted: true as const/);
  assert.match(page, /eq\(timelinePosts\.visibility, "network"\)/);
  assert.match(page, /eq\(projects\.visibility, "network"\)/);
  assert.match(page, /postReplies/);
  assert.match(page, /projectComments/);
  assert.match(page, /<PublicProfileAction/);
  assert.match(migration, /anthony@intaillium\.com/);
});
