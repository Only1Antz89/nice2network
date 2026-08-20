export const ONBOARDING_BIO_MIN_LENGTH = 40;
export const ONBOARDING_BIO_MIN_WORDS = 6;

export const PROFESSION_SUGGESTIONS = [
  "Entrepreneur",
  "Product designer",
  "Software engineer",
  "Project manager",
  "Operations manager",
  "Marketing manager",
  "Community organiser",
  "Consultant",
] as const;

export const INDUSTRY_SUGGESTIONS = [
  "Technology, data & digital",
  "Creative, design & crafts",
  "Climate, energy & utilities",
  "Healthcare & clinical care",
  "Education & training",
  "Finance, banking & insurance",
  "Business, consulting & administration",
  "Charity, community & social impact",
] as const;

export const SKILL_SUGGESTIONS = [
  "Product strategy",
  "Software development",
  "UX design",
  "User research",
  "Project management",
  "Operations",
  "Marketing",
  "Sales",
  "Community building",
  "Facilitation",
  "Data analysis",
  "Partnerships",
  "Financial planning",
  "Content strategy",
  "Leadership",
  "Fundraising",
] as const;

export const INTEREST_SUGGESTIONS = [
  "Startups",
  "Climate action",
  "Local communities",
  "Public good",
  "Health innovation",
  "Education",
  "Creative collaboration",
  "Social impact",
  "Emerging technology",
  "Inclusive design",
  "Future of work",
  "Sustainable business",
] as const;

const PLACEHOLDER_VALUES = new Set([
  "n/a",
  "na",
  "none",
  "nil",
  "no",
  "not sure",
  "other",
  "test",
  "testing",
  "unknown",
  "tbc",
  "tbd",
  "asdf",
  "aaa",
]);

export function normalizeOnboardingValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isMeaningfulOnboardingValue(value: string) {
  const normalized = normalizeOnboardingValue(value);
  const compact = normalized.toLowerCase().replace(/\s/g, "");
  if (normalized.length < 2 || PLACEHOLDER_VALUES.has(normalized.toLowerCase())) return false;
  if (/^(.)\1{2,}$/i.test(compact)) return false;
  return /[a-z0-9]{2}/i.test(normalized) || /^[a-z](?:\+\+|#)$/i.test(normalized);
}

export function bioWordCount(value: string) {
  return normalizeOnboardingValue(value).split(" ").filter(Boolean).length;
}

export function isMeaningfulOnboardingBio(value: string) {
  const normalized = normalizeOnboardingValue(value);
  if (normalized.length < ONBOARDING_BIO_MIN_LENGTH) return false;
  if (bioWordCount(normalized) < ONBOARDING_BIO_MIN_WORDS) return false;
  return !PLACEHOLDER_VALUES.has(normalized.toLowerCase());
}

export function parseOnboardingInterests(value: string) {
  return value.split(",").map(normalizeOnboardingValue).filter(Boolean);
}

export function hasUniqueValues(values: string[]) {
  const normalized = values.map(value => normalizeOnboardingValue(value).toLowerCase());
  return new Set(normalized).size === normalized.length;
}
