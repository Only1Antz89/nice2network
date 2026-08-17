import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { privacySettings, projectRoles, projects, users, verificationTokens } from "@/db/schema";
import { trackProductEvent } from "@/lib/analytics";
import { ONBOARDING_BIO_MIN_LENGTH, hasUniqueValues, isMeaningfulOnboardingBio, isMeaningfulOnboardingValue } from "@/lib/onboarding-profile";
import { recommendPeople } from "@/lib/people-recommendations";
import { isAvailableUsernameFormat } from "@/lib/usernames";

const schema = z.object({
  username: z.string().trim().toLowerCase().refine(isAvailableUsernameFormat, "Use 3–30 lowercase letters, numbers, underscores or hyphens. The username cannot be a reserved n2 page."),
  profession: z.string().trim().min(2, "Choose a suggestion or enter a specific profession.").max(100, "Profession must be 100 characters or fewer.").refine(isMeaningfulOnboardingValue, "Choose a suggestion or enter a specific profession."),
  industry: z.string().trim().min(2, "Choose a suggestion or enter a specific industry.").max(100, "Industry must be 100 characters or fewer.").refine(isMeaningfulOnboardingValue, "Choose a suggestion or enter a specific industry."),
  bio: z.string().trim().min(ONBOARDING_BIO_MIN_LENGTH, `Short bio must be at least ${ONBOARDING_BIO_MIN_LENGTH} characters.`).max(600, "Short bio must be 600 characters or fewer.").refine(isMeaningfulOnboardingBio, "Write at least 6 words about your experience and what you want to contribute."),
  primarySkill: z.string().trim().min(2, "Choose a suggestion or enter a specific primary skill.").max(80, "Primary skill must be 80 characters or fewer.").refine(isMeaningfulOnboardingValue, "Choose a suggestion or enter a specific primary skill."),
  secondarySkill: z.string().trim().min(2, "Choose a suggestion or enter a specific secondary skill.").max(80, "Secondary skill must be 80 characters or fewer.").refine(isMeaningfulOnboardingValue, "Choose a suggestion or enter a specific secondary skill."),
  tertiarySkill: z.string().trim().min(2, "Choose a suggestion or enter a specific tertiary skill.").max(80, "Tertiary skill must be 80 characters or fewer.").refine(isMeaningfulOnboardingValue, "Choose a suggestion or enter a specific tertiary skill."),
  interests: z.array(z.string().trim().min(2, "Each interest should be a meaningful topic.").max(50, "Each interest must be 50 characters or fewer.").refine(isMeaningfulOnboardingValue, "Each interest should be a meaningful topic.")).min(2, "Choose or enter at least two interests.").max(20, "Add no more than 20 interests.").refine(hasUniqueValues, "Remove duplicate interests."),
  location: z.string().trim().min(2, "Location must be at least 2 characters.").max(100, "Location must be 100 characters or fewer."),
  workMode: z.enum(["remote", "hybrid", "in_person"]),
  shareNetworkConnections: z.boolean().default(true),
  allowIntroductions: z.boolean().default(true),
}).superRefine((input,context)=>{
  if(!hasUniqueValues([input.primarySkill,input.secondarySkill,input.tertiarySkill]))context.addIssue({code:"custom",path:["secondarySkill"],message:"Choose three different skills so your profile has a clear range."});
});

export async function GET(request: Request) {
  try {
    const rawToken = (await cookies()).get("n2_onboarding")?.value;
    if (!rawToken) return NextResponse.json({ error: "Your onboarding link has expired." }, { status: 401 });
    const tokenHash = createHash("sha256").update(rawToken).digest("hex"), db = getDb();
    const [record] = await db.select().from(verificationTokens).where(and(eq(verificationTokens.token, tokenHash), gt(verificationTokens.expires, new Date()))).limit(1);
    if (!record?.identifier.startsWith("onboarding:")) return NextResponse.json({ error: "Your onboarding link has expired." }, { status: 401 });
    const email = record.identifier.slice("onboarding:".length);
    const [member] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.email, email)).limit(1);
    if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    const candidate = new URL(request.url).searchParams.get("username")?.trim().toLowerCase();
    if (!candidate) return NextResponse.json({ username: member.username });
    if (!isAvailableUsernameFormat(candidate)) return NextResponse.json({ username: member.username, available: false, reason: "format" });
    const [owner] = await db.select({ id: users.id }).from(users).where(and(eq(users.username, candidate), ne(users.id, member.id))).limit(1);
    return NextResponse.json({ username: member.username, available: !owner });
  } catch {
    return NextResponse.json({ error: "Could not check that username." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your profile details and try again." }, { status: 400 });
    const input = parsed.data;
    const rawToken = (await cookies()).get("n2_onboarding")?.value;
    if (!rawToken) return NextResponse.json({ error: "Your onboarding link has expired." }, { status: 401 });
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const db = getDb();
    const [record] = await db.select().from(verificationTokens).where(and(eq(verificationTokens.token, tokenHash), gt(verificationTokens.expires, new Date()))).limit(1);
    if (!record?.identifier.startsWith("onboarding:")) return NextResponse.json({ error: "Your onboarding link has expired." }, { status: 401 });
    const email = record.identifier.slice("onboarding:".length);
    const [existing] = await db.select({ id: users.id, ageBand: users.ageBand }).from(users).where(eq(users.email, email)).limit(1);
    if (!existing) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    const [usernameOwner] = await db.select({ id: users.id }).from(users).where(and(eq(users.username, input.username), ne(users.id, existing.id))).limit(1);
    if (usernameOwner) return NextResponse.json({ error: "That username is already taken. Choose another one." }, { status: 409 });
    const teen = existing?.ageBand === "teen_16_17";
    const rankedSkills = [input.primarySkill, input.secondarySkill, input.tertiarySkill];
    const [member] = await db.update(users).set({ username: input.username, profession: input.profession, headline: input.profession, industry: input.industry, bio: input.bio, primarySkill: input.primarySkill, secondarySkill: input.secondarySkill, tertiarySkill: input.tertiarySkill, skills: rankedSkills, interests: input.interests, location: teen ? null : input.location, workMode: input.workMode, status: "active", onboardingCompletedAt: new Date(), updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id, ageBand: users.ageBand });
    if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

    await db.insert(privacySettings).values({ userId: member.id, shareNetworkConnections: input.shareNetworkConnections, allowIntroductions: input.allowIntroductions }).onConflictDoUpdate({ target: privacySettings.userId, set: { shareNetworkConnections: input.shareNetworkConnections, allowIntroductions: input.allowIntroductions, updatedAt: new Date() } });

    await trackProductEvent({ actorId: member.id, ageBand: member.ageBand, event: "onboarding_completed", entityType: "user", entityId: member.id });
    const norm = (value: string) => value.trim().toLowerCase();
    const network = await recommendPeople(member.id,6);

    const projectCandidates = await db.select({ id: projects.id, title: projects.title, summary: projects.summary, industry: projects.industry, stage: projects.stage, accent: projects.accent, workMode: projects.workMode, location: projects.location, createdAt: projects.createdAt }).from(projects).where(and(eq(projects.status, "active"), inArray(projects.visibility, ["public", "network"]), ne(projects.ownerId, member.id))).orderBy(desc(projects.createdAt)).limit(40);
    const roles = projectCandidates.length ? await db.select({ projectId: projectRoles.projectId, title: projectRoles.title, requiredSkills: projectRoles.requiredSkills, usefulSkills: projectRoles.usefulSkills }).from(projectRoles).where(and(inArray(projectRoles.projectId, projectCandidates.map(project => project.id)), eq(projectRoles.status, "open"))) : [];
    const rolesByProject = new Map<string, typeof roles>();
    for (const role of roles) rolesByProject.set(role.projectId, [...(rolesByProject.get(role.projectId) ?? []), role]);
    const projectSuggestions = projectCandidates.map(project => {
      const roleText = (rolesByProject.get(project.id) ?? []).flatMap(role => [role.title, ...role.requiredSkills, ...role.usefulSkills]).join(" ").toLowerCase();
      const projectText = `${project.title} ${project.summary} ${project.industry} ${roleText}`.toLowerCase();
      const matchedSkills = rankedSkills.filter(skill => projectText.includes(norm(skill)));
      const matchedInterests = input.interests.filter(interest => projectText.includes(norm(interest)));
      const industryFit = norm(project.industry) === norm(input.industry);
      const workModeFit = project.workMode === input.workMode || project.workMode === "remote";
      const locationFit = Boolean(project.location && norm(project.location) === norm(input.location));
      const score = matchedSkills.length * 4 + matchedInterests.length * 2 + (industryFit ? 5 : 0) + (workModeFit ? 1 : 0) + (locationFit ? 1 : 0);
      const reasons = [...matchedSkills.slice(0, 2), ...matchedInterests.slice(0, 1), ...(industryFit ? [`${input.industry} project`] : []), ...(workModeFit ? [`${project.workMode} fit`] : [])].slice(0, 3);
      return { ...project, score, reasons };
    }).sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6);

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, record.identifier));
    const response = NextResponse.json({ network, projects: projectSuggestions });
    response.cookies.delete("n2_onboarding");
    return response;
  } catch {
    return NextResponse.json({ error: "Could not complete your profile." }, { status: 400 });
  }
}
