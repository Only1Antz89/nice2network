import "server-only";
import { and, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  blocks, careerHistory, follows, meetingParticipants, meetings, memberRecommendations,
  postLikes, privacySettings, projectEyes, projectMembers, projectRecommendations,
  projects, timelinePosts, users,
} from "@/db/schema";
import {
  canonicalPeopleTerm, peopleTerms, publicMeetingsAreSimilar, scorePeopleSignals,
  scoreWorthMeetingSignals, termOverlap,
} from "@/lib/people-recommendation-scoring";

const PEOPLE_ALGORITHM_VERSION = 2;
const norm = canonicalPeopleTerm;

export type PeopleSuggestionComponents = {
  skills?: number; projectFit?: number; postAffinity?: number; projectWatch?: number;
  meetAffinity?: number; context?: number; sharedInterests?: number; progression?: number; location?: number;
  professional?: number; relationship?: number; relevance?: number; availability?: number;
};

export type PeopleSuggestion = {
  recommendationId: string; id: string; name: string | null; image: string | null;
  profession: string | null; location: string | null; score: number; reasons: string[];
  components: PeopleSuggestionComponents; headline?: string; description?: string;
  isFollowing: boolean; isMutual: boolean;
};

async function loadViewer(userId: string) {
  const [viewer] = await getDb().select({
    id: users.id, name: users.name, profession: users.profession, industry: users.industry,
    primarySkill: users.primarySkill, secondarySkill: users.secondarySkill, tertiarySkill: users.tertiarySkill,
    skills: users.skills, interests: users.interests, city: users.city, country: users.country,
    ageBand: users.ageBand, useActivityForMatching: privacySettings.useActivityForMatching,
  }).from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(eq(users.id, userId)).limit(1);
  return viewer;
}

async function loadCandidates(userId: string, ageBands: string[], publicOnly = false) {
  const visibility = publicOnly
    ? eq(privacySettings.profileVisibility, "public")
    : or(eq(privacySettings.profileVisibility, "network"), eq(privacySettings.profileVisibility, "public"), sql`${privacySettings.userId} is null`);
  return getDb().select({
    id: users.id, name: users.name, image: users.image, profession: users.profession, headline: users.headline,
    industry: users.industry, primarySkill: users.primarySkill, secondarySkill: users.secondarySkill,
    tertiarySkill: users.tertiarySkill, skills: users.skills, interests: users.interests,
    location: users.location, city: users.city, country: users.country, ageBand: users.ageBand,
    showLocation: privacySettings.showLocation, useActivityForMatching: privacySettings.useActivityForMatching,
  }).from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(and(
    ne(users.id, userId), eq(users.status, "active"), sql`${users.emailVerified} is not null`,
    sql`${users.onboardingCompletedAt} is not null`, inArray(users.ageBand, ageBands), visibility,
    sql`not exists (select 1 from sanctions s where s.user_id=${users.id} and s.status='active' and s.type in ('suspension','ban') and (s.expires_at is null or s.expires_at>now()))`,
  )).limit(250);
}

type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];

async function excludedCandidateIds(userId: string) {
  const db = getDb();
  const [following, blocked, hidden] = await Promise.all([
    db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId)),
    db.select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId }).from(blocks).where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId))),
    db.select({ id: memberRecommendations.suggestedUserId }).from(memberRecommendations).where(and(eq(memberRecommendations.userId, userId), inArray(memberRecommendations.status, ["hidden", "not_relevant"]))),
  ]);
  return {
    following,
    excluded: new Set([userId, ...following.map((row) => row.id), ...hidden.map((row) => row.id), ...blocked.flatMap((row) => [row.blockerId, row.blockedId])]),
  };
}

function candidateSkills(candidate: Candidate) {
  return [candidate.primarySkill, candidate.secondarySkill, candidate.tertiarySkill, ...candidate.skills].filter((value): value is string => Boolean(value));
}

function rankedSkillStrength(viewer: NonNullable<Awaited<ReturnType<typeof loadViewer>>>, candidate: Candidate) {
  const ranked = [viewer.primarySkill, viewer.secondarySkill, viewer.tertiarySkill, ...viewer.skills]
    .map((value, index) => ({ value, weight: index === 0 ? 1 : index === 1 ? 0.75 : index === 2 ? 0.55 : 0.4 }))
    .filter((item): item is { value: string; weight: number } => Boolean(item.value));
  const candidateSet = new Set(candidateSkills(candidate).map(norm));
  const matches = ranked.filter((item) => candidateSet.has(norm(item.value)));
  return { strength: Math.min(1, matches.reduce((sum, item) => sum + item.weight, 0)), shared: matches.map((item) => item.value) };
}

type MeetEvidence = { id: string; industry: string | null; title: string; description: string | null };

async function loadMeetEvidence(userIds: string[]) {
  const db = getDb();
  const meetRows = await db.select({
    id: meetings.id, createdBy: meetings.createdBy, projectId: meetings.projectId,
    title: meetings.title, description: meetings.description,
  }).from(meetings).where(and(eq(meetings.visibility, "public"), eq(meetings.mode, "in_person"), lt(meetings.endsAt, new Date())));
  if (!meetRows.length) return new Map<string, MeetEvidence[]>();
  const linkedProjectIds = meetRows.flatMap((row) => row.projectId ? [row.projectId] : []);
  const [participants, projectRows] = await Promise.all([
    db.select({ meetingId: meetingParticipants.meetingId, userId: meetingParticipants.userId }).from(meetingParticipants)
      .where(and(inArray(meetingParticipants.meetingId, meetRows.map((row) => row.id)), inArray(meetingParticipants.userId, userIds))),
    linkedProjectIds.length
      ? db.select({ id: projects.id, industry: projects.industry }).from(projects).where(inArray(projects.id, linkedProjectIds))
      : [],
  ]);
  const industries = new Map(projectRows.map((row) => [row.id, row.industry]));
  const membersByMeet = new Map<string, Set<string>>();
  for (const row of participants) {
    const members = membersByMeet.get(row.meetingId) ?? new Set<string>();
    members.add(row.userId); membersByMeet.set(row.meetingId, members);
  }
  for (const row of meetRows) if (userIds.includes(row.createdBy)) {
    const members = membersByMeet.get(row.id) ?? new Set<string>();
    members.add(row.createdBy); membersByMeet.set(row.id, members);
  }
  const output = new Map<string, MeetEvidence[]>();
  for (const row of meetRows) {
    const evidence = { id: row.id, industry: row.projectId ? industries.get(row.projectId) ?? null : null, title: row.title, description: row.description };
    for (const memberId of membersByMeet.get(row.id) ?? []) output.set(memberId, [...(output.get(memberId) ?? []), evidence]);
  }
  return output;
}

function meetSignals(viewerMeets: MeetEvidence[], candidateMeets: MeetEvidence[]) {
  const same = viewerMeets.some((viewer) => candidateMeets.some((candidate) => candidate.id === viewer.id));
  const similar = !same && viewerMeets.some((viewer) => candidateMeets.some((candidate) => publicMeetingsAreSimilar(viewer, candidate)));
  return { same, similar };
}

export async function recommendPeople(userId: string, limit = 20): Promise<PeopleSuggestion[]> {
  const db = getDb(), viewer = await loadViewer(userId);
  if (!viewer) return [];
  const { following, excluded } = await excludedCandidateIds(userId);
  const ageBands = viewer.ageBand === "teen_16_17" ? ["teen_16_17"] : ["adult", "adult_18_24", "adult_25_plus"];
  const candidates = (await loadCandidates(userId, ageBands)).filter((candidate) => !excluded.has(candidate.id));
  if (!candidates.length) return [];
  const candidateIds = candidates.map((candidate) => candidate.id), allIds = [userId, ...candidateIds];
  const [memberProjectRows, mutualRows, ownedProjects, likeRows, meetEvidence] = await Promise.all([
    db.select({ userId: projectMembers.userId, projectId: projectMembers.projectId }).from(projectMembers).where(inArray(projectMembers.userId, allIds)),
    following.length ? db.select({ followerId: follows.followerId, followingId: follows.followingId }).from(follows).where(and(inArray(follows.followerId, following.map((row) => row.id)), inArray(follows.followingId, candidateIds))) : [],
    db.select({ id: projects.id, ownerId: projects.ownerId }).from(projects).where(and(inArray(projects.ownerId, allIds), eq(projects.status, "active"))),
    db.select({ postId: postLikes.postId, userId: postLikes.userId }).from(postLikes).where(inArray(postLikes.userId, allIds)),
    loadMeetEvidence(allIds),
  ]);
  const ownedProjectIds = ownedProjects.map((project) => project.id);
  const [projectFitRows, eyeRows, likedPosts] = await Promise.all([
    ownedProjectIds.length ? db.select({ userId: projectRecommendations.userId, projectId: projectRecommendations.projectId, score: projectRecommendations.score }).from(projectRecommendations).where(and(eq(projectRecommendations.status, "active"), inArray(projectRecommendations.userId, allIds), inArray(projectRecommendations.projectId, ownedProjectIds))) : [],
    ownedProjectIds.length ? db.select({ userId: projectEyes.userId, projectId: projectEyes.projectId }).from(projectEyes).where(and(inArray(projectEyes.userId, allIds), inArray(projectEyes.projectId, ownedProjectIds))) : [],
    likeRows.length ? db.select({ id: timelinePosts.id, authorId: timelinePosts.authorId }).from(timelinePosts).where(inArray(timelinePosts.id, [...new Set(likeRows.map((row) => row.postId))])) : [],
  ]);
  const projectOwner = new Map(ownedProjects.map((project) => [project.id, project.ownerId]));
  const authorByPost = new Map(likedPosts.map((post) => [post.id, post.authorId]));
  const viewerLiked = new Set(likeRows.filter((row) => row.userId === userId).map((row) => row.postId));
  const viewerProjects = new Set(memberProjectRows.filter((row) => row.userId === userId).map((row) => row.projectId));
  const viewerInterests = new Set(viewer.interests.map(norm)), viewerMeets = meetEvidence.get(userId) ?? [];

  const scored = candidates.map((candidate) => {
    const activityAllowed = viewer.ageBand !== "teen_16_17" && viewer.useActivityForMatching !== false && candidate.useActivityForMatching !== false;
    const skills = rankedSkillStrength(viewer, candidate), candidateLikes = likeRows.filter((row) => row.userId === candidate.id);
    const directPostLikes = activityAllowed ? candidateLikes.filter((row) => authorByPost.get(row.postId) === userId).length + likeRows.filter((row) => row.userId === userId && authorByPost.get(row.postId) === candidate.id).length : 0;
    const sharedPostLikes = activityAllowed ? candidateLikes.filter((row) => viewerLiked.has(row.postId)).length : 0;
    const watchesViewerProject = activityAllowed && eyeRows.some((row) => row.userId === candidate.id && projectOwner.get(row.projectId) === userId);
    const viewerWatchesCandidateProject = activityAllowed && eyeRows.some((row) => row.userId === userId && projectOwner.get(row.projectId) === candidate.id);
    const fitScore = Math.max(0, ...projectFitRows.filter((row) => (row.userId === candidate.id && projectOwner.get(row.projectId) === userId) || (row.userId === userId && projectOwner.get(row.projectId) === candidate.id)).map((row) => row.score));
    const candidateProjects = new Set(memberProjectRows.filter((row) => row.userId === candidate.id).map((row) => row.projectId));
    const sharedProjects = [...candidateProjects].filter((projectId) => viewerProjects.has(projectId)).length;
    const mutualPaths = new Set(mutualRows.filter((row) => row.followingId === candidate.id).map((row) => row.followerId)).size;
    const sharedInterests = candidate.interests.map(norm).filter((interest) => viewerInterests.has(interest));
    const sameCity = Boolean(viewer.city && candidate.city && norm(viewer.city) === norm(candidate.city));
    const contextStrength = Math.min(1, sharedProjects * 0.5 + mutualPaths * 0.25 + sharedInterests.length * 0.2 + (sameCity ? 0.25 : 0));
    const meets = meetSignals(viewerMeets, meetEvidence.get(candidate.id) ?? []);
    const result = scorePeopleSignals({ skillStrength: skills.strength, projectFitStrength: fitScore / 100, directPostLikes, sharedPostLikes, watchesViewerProject, viewerWatchesCandidateProject, samePublicMeet: meets.same, similarPublicMeet: meets.similar, contextStrength });
    const reasons = [
      ...(fitScore > 0 ? ["Potential project match"] : []),
      ...(watchesViewerProject ? ["They watch one of your projects"] : []),
      ...(viewerWatchesCandidateProject ? ["You watch one of their projects"] : []),
      ...(skills.shared.length ? [`${skills.shared.length} shared ${skills.shared.length === 1 ? "skill" : "skills"}`] : []),
      ...(directPostLikes > 0 ? ["You engage with each other’s posts"] : []),
      ...(sharedPostLikes > 0 ? ["You like some of the same posts"] : []),
      ...(meets.same ? ["You were invited to the same public meet"] : meets.similar ? ["Similar public meet interests"] : []),
      ...(sharedProjects ? [`${sharedProjects} mutual ${sharedProjects === 1 ? "project" : "projects"}`] : []),
      ...(sharedInterests.length ? [`${sharedInterests.length} shared ${sharedInterests.length === 1 ? "interest" : "interests"}`] : []),
      ...(mutualPaths ? [`${mutualPaths} useful network ${mutualPaths === 1 ? "path" : "paths"}`] : []),
      ...(sameCity ? ["Near you"] : []),
    ].slice(0, 3);
    return { candidate, ...result, reasons: reasons.length ? reasons : ["Complementary professional experience"] };
  }).filter((row) => row.score > 0).sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id)).slice(0, Math.min(50, limit));

  const reciprocal = new Set((await db.select({ id: follows.followerId }).from(follows).where(and(eq(follows.followingId, userId), inArray(follows.followerId, candidateIds)))).map((row) => row.id));
  const output: PeopleSuggestion[] = [];
  for (const row of scored) {
    const [record] = await db.insert(memberRecommendations).values({ userId, suggestedUserId: row.candidate.id, algorithmVersion: PEOPLE_ALGORITHM_VERSION, score: row.score, componentScores: row.components, reasons: row.reasons, expiresAt: new Date(Date.now() + 7 * 86_400_000) }).onConflictDoUpdate({
      target: [memberRecommendations.userId, memberRecommendations.suggestedUserId, memberRecommendations.algorithmVersion],
      set: { score: row.score, componentScores: row.components, reasons: row.reasons, status: "active", generatedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    }).returning({ id: memberRecommendations.id });
    output.push({ recommendationId: record.id, id: row.candidate.id, name: row.candidate.name, image: row.candidate.image, profession: row.candidate.profession, location: row.candidate.showLocation === false ? null : row.candidate.location, score: row.score, components: row.components, reasons: row.reasons, isFollowing: false, isMutual: reciprocal.has(row.candidate.id) });
  }
  return output;
}

export async function recommendWorthMeeting(userId: string): Promise<PeopleSuggestion | null> {
  const db = getDb(), viewer = await loadViewer(userId);
  if (!viewer) return null;
  const { excluded } = await excludedCandidateIds(userId);
  const ageBands = viewer.ageBand === "teen_16_17" ? ["teen_16_17"] : ["adult", "adult_18_24", "adult_25_plus"];
  const candidates = (await loadCandidates(userId, ageBands, true)).filter((candidate) => !excluded.has(candidate.id));
  if (!candidates.length) return null;
  const candidateIds = candidates.map((candidate) => candidate.id), allIds = [userId, ...candidateIds];
  const [careerRows, ownedProjects, memberships] = await Promise.all([
    db.select({ userId: careerHistory.userId, title: careerHistory.title }).from(careerHistory).where(inArray(careerHistory.userId, allIds)),
    db.select({ id: projects.id, ownerId: projects.ownerId, stage: projects.stage }).from(projects).where(and(inArray(projects.ownerId, allIds), eq(projects.status, "active"))),
    db.select({ userId: projectMembers.userId, stage: projects.stage }).from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(and(inArray(projectMembers.userId, allIds), eq(projects.status, "active"))),
  ]);
  const stagesByUser = new Map<string, Set<string>>();
  for (const project of ownedProjects) stagesByUser.set(project.ownerId, new Set([...(stagesByUser.get(project.ownerId) ?? []), project.stage]));
  for (const membership of memberships) stagesByUser.set(membership.userId, new Set([...(stagesByUser.get(membership.userId) ?? []), membership.stage]));
  const stageOrder = new Map([["idea", 0], ["planning", 1], ["building", 2], ["launching", 3]]);
  const viewerCareer = peopleTerms([viewer.profession, ...careerRows.filter((row) => row.userId === userId).map((row) => row.title)]);
  const viewerStages = [...(stagesByUser.get(userId) ?? [])], viewerInterests = new Set(viewer.interests.map(norm));
  const ranked = candidates.map((candidate) => {
    const sharedInterests = candidate.interests.filter((interest) => viewerInterests.has(norm(interest)));
    const candidateCareer = peopleTerms([candidate.profession, ...careerRows.filter((row) => row.userId === candidate.id).map((row) => row.title)]);
    const careerStrength = Math.min(1, termOverlap(viewerCareer, candidateCareer).length / 2);
    const candidateStages = [...(stagesByUser.get(candidate.id) ?? [])];
    let projectStageStrength = 0;
    for (const left of viewerStages) for (const right of candidateStages) {
      const distance = Math.abs((stageOrder.get(left) ?? 0) - (stageOrder.get(right) ?? 0));
      projectStageStrength = Math.max(projectStageStrength, distance === 0 ? 1 : distance === 1 ? 0.7 : 0.35);
    }
    const sameCity = Boolean(viewer.city && candidate.city && norm(viewer.city) === norm(candidate.city));
    const sameCountry = Boolean(viewer.country && candidate.country && norm(viewer.country) === norm(candidate.country));
    const result = scoreWorthMeetingSignals({ sharedInterestCount: sharedInterests.length, careerStrength, projectStageStrength, sameCity, sameCountry, candidateLocationVisible: candidate.showLocation !== false });
    const firstName = candidate.name?.split(" ")[0] ?? "this member";
    const headline = sharedInterests.length ? `You and ${firstName} both care about ${sharedInterests[0].toLowerCase()}.` : `You and ${firstName} are building along similar paths${sameCity && candidate.city ? ` in ${candidate.city}` : ""}.`;
    const description = candidate.headline ?? (careerStrength > 0 && projectStageStrength > 0 ? `${firstName} is progressing through related work and projects${sameCity ? " near you" : ""}.` : `${firstName} shares a relevant professional direction${sameCity ? " near you" : ""}.`);
    const reasons = [
      ...(sharedInterests.length ? [`${sharedInterests.length} shared ${sharedInterests.length === 1 ? "interest" : "interests"}`] : []),
      ...(careerStrength > 0 ? ["Related career direction"] : []),
      ...(projectStageStrength > 0 ? ["Comparable project progression"] : []),
      ...(sameCity ? ["Near you"] : sameCountry ? ["In your country"] : []),
    ].slice(0, 3);
    return { candidate, headline, description, reasons, ...result };
  }).filter((row) => row.eligible).sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
  const best = ranked[0];
  if (!best) return null;
  return {
    recommendationId: `worth-meeting:${best.candidate.id}`, id: best.candidate.id,
    name: best.candidate.name, image: best.candidate.image, profession: best.candidate.profession,
    location: best.candidate.showLocation === false ? null : best.candidate.location,
    score: best.score, components: best.components, reasons: best.reasons,
    headline: best.headline, description: best.description, isFollowing: false, isMutual: false,
  };
}
