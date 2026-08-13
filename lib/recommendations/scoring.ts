export const ROLE_WEIGHTS = {
  requiredSkills: 35, profession: 20, career: 10, compatibility: 15,
  availability: 8, relevance: 5, learned: 5, warmPath: 2,
} as const;

export const FEED_WEIGHTS = {
  roleMatch: 55, urgency: 12, relevance: 8, eyes: 10,
  freshness: 5, network: 5, exploration: 5,
} as const;
export type RoleWeightConfig = { [Key in keyof typeof ROLE_WEIGHTS]: number };
export type FeedWeightConfig = { [Key in keyof typeof FEED_WEIGHTS]: number };

const aliasGroups = [
  ["software engineer", "software developer", "developer", "programmer", "software development"],
  ["full stack", "full-stack", "full stack engineer", "full-stack engineer", "web development"],
  ["frontend", "front-end", "front end", "react", "ui engineering"],
  ["backend", "back-end", "back end", "api development", "server-side"],
  ["product designer", "ux designer", "ui/ux", "ux design", "product design"],
  ["product manager", "product lead", "product management"],
  ["project manager", "programme manager", "program manager", "project management"],
  ["qa engineer", "test engineer", "quality assurance", "software testing"],
  ["data scientist", "data science", "machine learning", "ai engineer"],
  ["meteorologist", "meteorology", "weather forecasting", "weather science"],
  ["community manager", "community lead", "community building"],
  ["operations manager", "operations lead", "operations"],
  ["finance manager", "accountant", "financial planning", "finance"],
  ["partnerships manager", "partnerships lead", "partnerships"],
];

export function canonicalTerm(value: string | null | undefined) {
  const clean = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9+#]+/g, " ").replace(/\s+/g, " ");
  return aliasGroups.find(group => group.some(alias => clean === alias || clean.includes(alias) || alias.includes(clean)))?.[0] ?? clean;
}

function exactOrAlias(a: string, b: string) {
  const left = canonicalTerm(a), right = canonicalTerm(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function clamp(value: number, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export type RoleMatchInput = {
  member: {
    profession?: string | null; primarySkill?: string | null; secondarySkill?: string | null; tertiarySkill?: string | null;
    industry?: string | null; interests?: string[]; city?: string | null; country?: string | null; timezone?: string | null;
    workMode?: string | null; availability?: string | null; currentProjectLoad?: number; careerTitles?: string[];
  };
  role: { title: string; professions: string[]; requiredSkills: string[]; usefulSkills: string[]; criticality: string; workMode?: string | null };
  project: { industry: string; workMode: string; city?: string | null; country?: string | null; timezone?: string | null; allowRemoteFallback: boolean };
  semanticSimilarity?: number;
  learnedAffinity?: number;
  warmPath?: boolean;
  weights?: Partial<RoleWeightConfig>;
};

function rankedSkillMatch(input: RoleMatchInput) {
  const ranked = [
    { value: input.member.primarySkill, weight: 1 },
    { value: input.member.secondarySkill, weight: .75 },
    { value: input.member.tertiarySkill, weight: .55 },
  ].filter(item => item.value);
  const required = input.role.requiredSkills;
  if (!required.length) return .5;
  const direct = average(required.map(skill => Math.max(0, ...ranked.map(memberSkill => exactOrAlias(memberSkill.value!, skill) ? memberSkill.weight : 0))));
  // Semantic similarity can clarify terminology, but contributes no more than 20% of this component.
  return clamp(direct + Math.min(.2, Math.max(0, (input.semanticSimilarity ?? 0) - .65) * .4));
}

function timezoneOffsetHours(zone?: string | null) {
  if (!zone) return null;
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "longOffset", hour: "2-digit" }).formatToParts(now);
    const match = parts.find(part => part.type === "timeZoneName")?.value.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return 0;
    return (match[1] === "-" ? -1 : 1) * (Number(match[2]) + Number(match[3] ?? 0) / 60);
  } catch { return null; }
}

export function workCompatibility(input: RoleMatchInput) {
  const mode = input.role.workMode || input.project.workMode;
  const sameCity = Boolean(input.project.city && input.member.city && canonicalTerm(input.project.city) === canonicalTerm(input.member.city));
  const sameCountry = Boolean(input.project.country && input.member.country && canonicalTerm(input.project.country) === canonicalTerm(input.member.country));
  const projectOffset = timezoneOffsetHours(input.project.timezone), memberOffset = timezoneOffsetHours(input.member.timezone);
  const timezoneGap = projectOffset == null || memberOffset == null ? 4 : Math.abs(projectOffset - memberOffset);
  if (mode === "in_person") return { eligible: sameCity || (input.project.allowRemoteFallback && input.role.workMode === "remote"), score: sameCity ? 1 : .35 };
  if (mode === "hybrid") {
    if (sameCity) return { eligible: true, score: 1 };
    if (sameCountry) return { eligible: true, score: .75 };
    if (input.project.allowRemoteFallback && timezoneGap <= 3) return { eligible: true, score: .55 };
    return { eligible: false, score: 0 };
  }
  if (sameCity) return { eligible: true, score: 1 };
  if (sameCountry) return { eligible: true, score: .9 };
  return { eligible: true, score: timezoneGap <= 3 ? .8 : timezoneGap <= 6 ? .6 : .35 };
}

export function scoreRoleMatch(input: RoleMatchInput) {
  const weights = { ...ROLE_WEIGHTS, ...(input.weights ?? {}) };
  const requiredSkills = rankedSkillMatch(input);
  const professionTerms = [input.member.profession, ...(input.member.careerTitles ?? [])].filter((value): value is string => Boolean(value));
  const profession = input.role.professions.some(required => professionTerms.some(value => exactOrAlias(value, required))) ? 1 : clamp((input.semanticSimilarity ?? 0) * .65);
  const career = (input.member.careerTitles ?? []).some(title => exactOrAlias(title, input.role.title) || input.role.requiredSkills.some(skill => exactOrAlias(title, skill))) ? 1 : profession * .6;
  const compatibilityResult = workCompatibility(input);
  if (!compatibilityResult.eligible) return { eligible: false, score: 0, tier: "none" as const, componentScores: {}, reasons: ["Working-location requirements do not match"] };
  const load = input.member.currentProjectLoad ?? 0;
  const availability = input.member.availability === "open" ? clamp(1 - load * .18, .25, 1) : input.member.availability === "limited" ? .45 : 0;
  const relevance = exactOrAlias(input.member.industry ?? "", input.project.industry) ? 1 : (input.member.interests ?? []).some(value => exactOrAlias(value, input.project.industry)) ? .7 : .2;
  const learned = clamp(input.learnedAffinity ?? 0);
  const warmPath = input.warmPath ? 1 : 0;
  const componentScores = {
    requiredSkills: requiredSkills * weights.requiredSkills,
    profession: profession * weights.profession,
    career: career * weights.career,
    compatibility: compatibilityResult.score * weights.compatibility,
    availability: availability * weights.availability,
    relevance: relevance * weights.relevance,
    learned: learned * weights.learned,
    warmPath: warmPath * weights.warmPath,
  };
  let score = Math.round(Object.values(componentScores).reduce((sum, value) => sum + value, 0));
  if (input.role.criticality === "critical" && requiredSkills < .35) score = Math.min(score, 59);
  const reasons = [
    [componentScores.requiredSkills, requiredSkills >= .5 ? "Required skills align" : null],
    [componentScores.profession, profession >= .65 ? "Profession fits this role" : null],
    [componentScores.career, career >= .7 ? "Career history supports the work" : null],
    [componentScores.compatibility, compatibilityResult.score >= .75 ? "Working style and location fit" : null],
    [componentScores.relevance, relevance >= .7 ? "Relevant industry or interests" : null],
    [componentScores.warmPath, warmPath ? "A warm network path exists" : null],
  ].filter((entry): entry is [number, string] => Boolean(entry[1])).sort((a, b) => b[0] - a[0]).slice(0, 3).map(entry => entry[1]);
  const tier = score >= 78 ? "strong" : score >= 60 ? "good" : score >= 45 ? "exploration" : "none";
  return { eligible: score >= 45, score, tier, componentScores, reasons };
}

export function isRolePhaseActive(phase: string, projectStage: string, roles: Array<{ phase: string; capacity: number; filled: number; criticality?: string }>) {
  if (phase === "now") return true;
  const now = roles.filter(role => role.phase === "now");
  const nowFillRate = now.reduce((sum, role) => sum + role.filled, 0) / Math.max(1, now.reduce((sum, role) => sum + role.capacity, 0));
  if (phase === "next") return nowFillRate >= .7 || ["planning", "building", "launching"].includes(projectStage);
  const earlierCriticalOpen = roles.some(role => role.phase !== "later" && role.criticality === "critical" && role.filled < role.capacity);
  return !earlierCriticalOpen && ["building", "launching"].includes(projectStage);
}

export function eyeMomentum(input: { createdAt: Date; now?: Date }[]) {
  const now = (input[0]?.now ?? new Date()).getTime();
  const recentWeighted = input.reduce((sum, eye) => {
    const ageHours = Math.max(0, (now - eye.createdAt.getTime()) / 3_600_000);
    if (ageHours <= 24) return sum + 1;
    if (ageHours > 168) return sum;
    return sum + (168 - ageHours) / 144;
  }, 0);
  const recent = 6 * clamp(recentWeighted / 12);
  const lifetime = 4 * clamp(Math.log1p(input.length) / Math.log1p(50));
  return { score: recent + lifetime, recent, lifetime };
}

export function feedScore(input: { roleScore: number; criticality: string; filled: number; capacity: number; interestRelevance: number; eyeScore: number; ageHours: number; warmPath: boolean; exploration: boolean; weights?: Partial<FeedWeightConfig> }) {
  const weights = { ...FEED_WEIGHTS, ...(input.weights ?? {}) };
  const urgency = input.filled >= input.capacity ? 0 : input.criticality === "critical" ? 1 : input.criticality === "important" ? .7 : .4;
  const freshness = clamp(1 - input.ageHours / (24 * 14));
  return input.roleScore / 100 * weights.roleMatch + urgency * weights.urgency + clamp(input.interestRelevance) * weights.relevance + clamp(input.eyeScore / 10) * weights.eyes + freshness * weights.freshness + (input.warmPath ? weights.network : 0) + (input.exploration ? weights.exploration : 0);
}

export function recommendationSignalWeight(signal: string) {
  return ({ eye: 1, star: 1.5, comment: 2, application: 4, accepted_role: 6, joined: 6, completed: 8, dismiss: -2, not_relevant: -4, not_now: 0 } as Record<string, number>)[signal] ?? 0;
}
