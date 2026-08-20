import { CAREER_SECTORS } from "./career-sectors.ts";
import { isMeaningfulOnboardingValue, normalizeOnboardingValue } from "./onboarding-profile.ts";

export const OTHER_PROFESSION = "Other";

export const PROFESSIONS = [
  ...new Set(CAREER_SECTORS.flatMap(({ careers }) => careers)),
].sort((a, b) => a.localeCompare(b));

export const PROFILE_INDUSTRIES = CAREER_SECTORS.map(({ sector }) => sector);

function canonicalValue(value: string, allowed: readonly string[]) {
  const normalized = normalizeOnboardingValue(value).toLocaleLowerCase();
  return allowed.find(candidate => candidate.toLocaleLowerCase() === normalized) ?? null;
}

export function canonicalProfession(value: string) {
  return canonicalValue(value, [...PROFESSIONS, OTHER_PROFESSION]);
}

export function canonicalIndustry(value: string) {
  return canonicalValue(value, PROFILE_INDUSTRIES);
}

export function isMeaningfulOtherHeadline(value: string) {
  const normalized = normalizeOnboardingValue(value);
  const words = normalized.split(" ").filter(Boolean);
  if (normalized.length < 6 || words.length < 2 || normalized.length > 160) return false;
  if (!isMeaningfulOnboardingValue(normalized) || canonicalValue(normalized, [OTHER_PROFESSION])) return false;
  if (/https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(normalized)) return false;
  const compact = normalized.replace(/\s/g, "");
  if (/^(.)\1{3,}$/i.test(compact)) return false;
  const alphanumeric = (normalized.match(/[a-z0-9]/gi) ?? []).length;
  return alphanumeric / normalized.length >= 0.6;
}
