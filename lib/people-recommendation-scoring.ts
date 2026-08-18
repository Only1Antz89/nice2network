export const PEOPLE_COMPONENT_WEIGHTS = {
  skills: 25,
  projectFit: 25,
  postAffinity: 15,
  projectWatch: 15,
  meetAffinity: 15,
  context: 5,
} as const;

export const WORTH_MEETING_WEIGHTS = {
  sharedInterests: 40,
  progression: 35,
  location: 25,
} as const;

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "been", "being", "build", "building", "for", "from", "have", "into", "meet", "meeting", "more", "public", "that", "the", "their", "this", "through", "with", "your",
]);

export function canonicalPeopleTerm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9+#]+/g, " ").replace(/\s+/g, " ");
}

export function peopleTerms(values: Array<string | null | undefined>) {
  return new Set(values.flatMap((value) => canonicalPeopleTerm(value).split(" ").filter((term) => term.length > 2 && !STOP_WORDS.has(term))));
}

export function termOverlap(left: Set<string>, right: Set<string>) {
  return [...left].filter((term) => right.has(term));
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export type PeopleSignalInput = {
  skillStrength: number;
  projectFitStrength: number;
  directPostLikes: number;
  sharedPostLikes: number;
  watchesViewerProject: boolean;
  viewerWatchesCandidateProject: boolean;
  samePublicMeet: boolean;
  similarPublicMeet: boolean;
  contextStrength: number;
};

export function scorePeopleSignals(input: PeopleSignalInput) {
  const postStrength = clamp(input.directPostLikes * 0.5 + input.sharedPostLikes * 0.25);
  const watchStrength = input.watchesViewerProject && input.viewerWatchesCandidateProject ? 1 : input.watchesViewerProject || input.viewerWatchesCandidateProject ? 0.7 : 0;
  const meetStrength = input.samePublicMeet ? 1 : input.similarPublicMeet ? 0.75 : 0;
  const components = {
    skills: Math.round(clamp(input.skillStrength) * PEOPLE_COMPONENT_WEIGHTS.skills),
    projectFit: Math.round(clamp(input.projectFitStrength) * PEOPLE_COMPONENT_WEIGHTS.projectFit),
    postAffinity: Math.round(postStrength * PEOPLE_COMPONENT_WEIGHTS.postAffinity),
    projectWatch: Math.round(watchStrength * PEOPLE_COMPONENT_WEIGHTS.projectWatch),
    meetAffinity: Math.round(meetStrength * PEOPLE_COMPONENT_WEIGHTS.meetAffinity),
    context: Math.round(clamp(input.contextStrength) * PEOPLE_COMPONENT_WEIGHTS.context),
  };
  return { score: Object.values(components).reduce((sum, value) => sum + value, 0), components };
}

export type WorthMeetingSignalInput = {
  sharedInterestCount: number;
  careerStrength: number;
  projectStageStrength: number;
  sameCity: boolean;
  sameCountry: boolean;
  candidateLocationVisible: boolean;
};

export function scoreWorthMeetingSignals(input: WorthMeetingSignalInput) {
  const interestStrength = input.sharedInterestCount >= 2 ? 1 : input.sharedInterestCount === 1 ? 0.6 : 0;
  const progressionStrength = clamp(input.careerStrength * 0.5 + input.projectStageStrength * 0.5);
  const locationStrength = input.candidateLocationVisible ? input.sameCity ? 1 : input.sameCountry ? 0.6 : 0 : 0;
  const components = {
    sharedInterests: Math.round(interestStrength * WORTH_MEETING_WEIGHTS.sharedInterests),
    progression: Math.round(progressionStrength * WORTH_MEETING_WEIGHTS.progression),
    location: Math.round(locationStrength * WORTH_MEETING_WEIGHTS.location),
  };
  const categories = Object.values(components).filter((value) => value > 0).length;
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { score, components, eligible: categories >= 2 && score >= 45 };
}

export function publicMeetingsAreSimilar(
  left: { industry?: string | null; title?: string | null; description?: string | null },
  right: { industry?: string | null; title?: string | null; description?: string | null },
) {
  const leftIndustry = canonicalPeopleTerm(left.industry), rightIndustry = canonicalPeopleTerm(right.industry);
  if (leftIndustry && leftIndustry === rightIndustry) return true;
  return termOverlap(peopleTerms([left.title, left.description]), peopleTerms([right.title, right.description])).length >= 2;
}
