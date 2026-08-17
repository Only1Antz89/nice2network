const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "of", "on", "or", "our", "that", "the", "their", "this", "to", "we", "with", "your",
]);

export const PROJECT_SIMILARITY_WEIGHTS = {
  semantic: 50,
  employment: 20,
  location: 10,
  size: 10,
  development: 10,
} as const;

export const PROJECT_SEMANTIC_THRESHOLD = 0.82;
export const PROJECT_ROLE_FIT_THRESHOLD = 45;
export const PROJECT_OVERALL_THRESHOLD = 80;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token)));
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return 2 * intersection / (left.size + right.size);
}

export function lexicalProjectSimilarity(source: { title: string; summary: string; description?: string | null; industry: string }, target: { title: string; summary: string; description?: string | null; industry: string }) {
  const title = dice(tokens(source.title), tokens(target.title));
  const body = dice(tokens(`${source.summary} ${source.description ?? ""}`), tokens(`${target.summary} ${target.description ?? ""}`));
  const sourceIndustry = source.industry.trim().toLowerCase(), targetIndustry = target.industry.trim().toLowerCase();
  const industry = sourceIndustry === targetIndustry || sourceIndustry.includes(targetIndustry) || targetIndustry.includes(sourceIndustry) ? 1 : 0;
  return clamp(title * .35 + body * .5 + industry * .15);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0, leftMagnitude = 0, rightMagnitude = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  return leftMagnitude && rightMagnitude ? clamp(dot / Math.sqrt(leftMagnitude * rightMagnitude)) : 0;
}

export function teamSizeSimilarity(sourceSize: number, targetSize: number) {
  const smaller = Math.max(1, Math.min(sourceSize, targetSize));
  const larger = Math.max(1, sourceSize, targetSize);
  return clamp(smaller / larger);
}

const STAGE_RANK: Record<string, number> = { idea: 0, planning: 1, building: 2, launching: 3 };

export function developmentCompatibility(sourceStage: string, targetStage: string, targetCompleted: number, targetMilestones: number) {
  const source = STAGE_RANK[sourceStage] ?? 0, target = STAGE_RANK[targetStage] ?? 0;
  const completion = targetMilestones ? clamp(targetCompleted / targetMilestones) : 0;
  if (target >= source) return clamp(.8 + completion * .2);
  return clamp(.5 / (source - target + 1) + completion * .2);
}

function timezoneOffset(zone?: string | null) {
  if (!zone) return null;
  try {
    const part = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "longOffset", hour: "2-digit" }).formatToParts(new Date()).find(item => item.type === "timeZoneName")?.value;
    const match = part?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return 0;
    return (match[1] === "-" ? -1 : 1) * (Number(match[2]) + Number(match[3] ?? 0) / 60);
  } catch { return null; }
}

const normalisePlace = (value?: string | null) => (value ?? "").trim().toLowerCase();

export function projectLocationCompatibility(source: { city?: string | null; country?: string | null; timezone?: string | null; workMode: string }, target: { city?: string | null; country?: string | null; timezone?: string | null; workMode: string }) {
  if (source.workMode === "remote" && target.workMode === "remote") return 1;
  if (source.city && target.city && normalisePlace(source.city) === normalisePlace(target.city)) return 1;
  if (source.country && target.country && normalisePlace(source.country) === normalisePlace(target.country)) return .8;
  const sourceOffset = timezoneOffset(source.timezone), targetOffset = timezoneOffset(target.timezone);
  const gap = sourceOffset == null || targetOffset == null ? Infinity : Math.abs(sourceOffset - targetOffset);
  if (source.workMode !== "in_person" && target.workMode !== "in_person" && gap <= 3) return .65;
  if (target.workMode === "remote") return .65;
  return .25;
}

export function employmentOpportunity(roleFitScore: number, openings: number) {
  return clamp(roleFitScore / 100 * .8 + Math.min(1, Math.max(0, openings) / 3) * .2);
}

export type ProjectSimilarityComponents = {
  semantic: number;
  employment: number;
  location: number;
  size: number;
  development: number;
  roleFitScore: number;
};

export function scoreProjectSimilarity(components: ProjectSimilarityComponents) {
  const score = Math.round(
    clamp(components.semantic) * PROJECT_SIMILARITY_WEIGHTS.semantic +
    clamp(components.employment) * PROJECT_SIMILARITY_WEIGHTS.employment +
    clamp(components.location) * PROJECT_SIMILARITY_WEIGHTS.location +
    clamp(components.size) * PROJECT_SIMILARITY_WEIGHTS.size +
    clamp(components.development) * PROJECT_SIMILARITY_WEIGHTS.development,
  );
  return {
    score,
    qualifies: components.semantic >= PROJECT_SEMANTIC_THRESHOLD && components.roleFitScore >= PROJECT_ROLE_FIT_THRESHOLD && score >= PROJECT_OVERALL_THRESHOLD,
  };
}

export function similarityReasons(input: ProjectSimilarityComponents & { roleTitle: string; openings: number; locationLabel?: string | null }) {
  const reasons: Array<[number, string]> = [
    [input.employment * 20, `${input.roleTitle} has ${input.openings} open ${input.openings === 1 ? "place" : "places"} that fit your profile`],
    [input.semantic * 50, input.semantic >= .9 ? "The purpose and industry are very closely aligned" : "The project purpose is closely aligned"],
    [input.location * 10, input.location >= .8 ? `${input.locationLabel || "The location"} and working style align` : "The working locations are compatible"],
    [input.size * 10, "The planned team sizes are similar"],
    [input.development * 10, "This project is at least as developed"],
  ];
  return reasons.sort((left, right) => right[0] - left[0]).slice(0, 3).map(([, reason]) => reason);
}
