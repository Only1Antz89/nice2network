import test from "node:test";
import assert from "node:assert/strict";
import {
  INDUSTRY_SUGGESTIONS,
  INTEREST_SUGGESTIONS,
  PROFESSION_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  hasUniqueValues,
  isMeaningfulOnboardingBio,
  isMeaningfulOnboardingValue,
  parseOnboardingInterests,
} from "../lib/onboarding-profile.ts";

test("onboarding offers useful starting points", () => {
  assert.ok(PROFESSION_SUGGESTIONS.length >= 8);
  assert.ok(INDUSTRY_SUGGESTIONS.length >= 8);
  assert.ok(SKILL_SUGGESTIONS.length >= 12);
  assert.ok(INTEREST_SUGGESTIONS.length >= 10);
});

test("onboarding rejects one-letter and placeholder profile values", () => {
  for (const value of ["A", "C", "W", "test", "N/A", "aaa"]) assert.equal(isMeaningfulOnboardingValue(value), false, value);
  for (const value of ["AI", "C++", "UX design", "Community management"]) assert.equal(isMeaningfulOnboardingValue(value), true, value);
});

test("onboarding requires a substantive bio and distinct selections", () => {
  assert.equal(isMeaningfulOnboardingBio("Test N/AAA"), false);
  assert.equal(isMeaningfulOnboardingBio("I build useful digital services with local communities and delivery teams."), true);
  assert.equal(hasUniqueValues(["Research", "research", "Facilitation"]), false);
  assert.deepEqual(parseOnboardingInterests(" Climate action, , Local communities "), ["Climate action", "Local communities"]);
});
