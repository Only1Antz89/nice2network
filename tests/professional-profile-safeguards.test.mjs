import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalIndustry,
  canonicalProfession,
  isMeaningfulOtherHeadline,
  OTHER_PROFESSION,
} from "../lib/professional-profile.ts";
import { INDUSTRY_SUGGESTIONS, PROFESSION_SUGGESTIONS } from "../lib/onboarding-profile.ts";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("professional taxonomy canonicalizes listed values and rejects invented ones", () => {
  assert.equal(canonicalProfession(" software ENGINEER "), "Software engineer");
  assert.equal(canonicalIndustry("technology, DATA & DIGITAL"), "Technology, data & digital");
  assert.equal(canonicalProfession(OTHER_PROFESSION), OTHER_PROFESSION);
  assert.equal(canonicalProfession("Troll"), null);
  assert.equal(canonicalIndustry("tomfoolery"), null);
  for (const profession of PROFESSION_SUGGESTIONS) assert.equal(canonicalProfession(profession), profession);
  for (const industry of INDUSTRY_SUGGESTIONS) assert.equal(canonicalIndustry(industry), industry);
});

test("unlisted professions require a meaningful two-word headline", () => {
  for (const value of ["Troll", "Other", "www.example.com role", "!!!!! ?????", "aaaa aaaa"]) {
    assert.equal(isMeaningfulOtherHeadline(value), false, value);
  }
  assert.equal(isMeaningfulOtherHeadline("Circular economy facilitator"), true);
});

test("platform safeguard is enabled, permission-gated and audited", async () => {
  const [schema, migration, route] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0036_dark_iron_lad.sql"),
    read("app/api/admin/platform-settings/route.ts"),
  ]);
  assert.match(schema, /export const platformSettings = pgTable\("platform_settings"/);
  assert.match(schema, /profileTaxonomySafeguardsEnabled: boolean\("profile_taxonomy_safeguards_enabled"\).*default\(true\)/);
  assert.match(migration, /INSERT INTO "platform_settings".*true/);
  assert.match(route, /requirePermission\("system\.view"\)/);
  assert.match(route, /requirePermission\("system\.manage"\)/);
  assert.match(route, /reason: z\.string\(\)\.trim\(\)\.min\(10\)/);
  assert.match(route, /platform\.profile_taxonomy_safeguards_updated/);
});

test("onboarding and profile edits enforce the shared toggle on the server", async () => {
  const [onboarding, profile, onboardingPage, mainPage, admin] = await Promise.all([
    read("app/api/auth/onboarding/route.ts"),
    read("app/api/profiles/[userId]/route.ts"),
    read("app/onboarding/page.tsx"),
    read("app/page.tsx"),
    read("app/admin/admin-console.tsx"),
  ]);
  for (const route of [onboarding, profile]) {
    assert.match(route, /getPlatformSettings/);
    assert.match(route, /canonicalProfession/);
    assert.match(route, /canonicalIndustry/);
    assert.match(route, /isMeaningfulOtherHeadline/);
  }
  assert.match(onboarding, /profileTaxonomySafeguardsEnabled/);
  assert.match(profile, /input\.profession !== undefined/);
  assert.match(profile, /input\.industry !== undefined/);
  assert.match(onboardingPage, /mode="profession" strict/);
  assert.match(onboardingPage, /Use your genuine professional details/);
  assert.match(mainPage, /profileSafeguardsEnabled/);
  assert.match(admin, /Professional profile safeguards/);
  assert.match(admin, /\/api\/admin\/platform-settings/);
});
