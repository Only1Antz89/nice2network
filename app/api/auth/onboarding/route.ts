import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { privacySettings, projectRoles, projects, users, verificationTokens } from "@/db/schema";
import { trackProductEvent } from "@/lib/analytics";
import { recommendPeople } from "@/lib/people-recommendations";

const schema = z.object({
  profession: z.string().trim().min(2, "Profession must be at least 2 characters.").max(100, "Profession must be 100 characters or fewer."),
  industry: z.string().trim().min(2, "Industry must be at least 2 characters.").max(100, "Industry must be 100 characters or fewer."),
  bio: z.string().trim().min(10, "Short bio must be at least 10 characters.").max(600, "Short bio must be 600 characters or fewer."),
  primarySkill: z.string().trim().min(1, "Enter your primary skill.").max(80, "Primary skill must be 80 characters or fewer."),
  secondarySkill: z.string().trim().min(1, "Enter your secondary skill.").max(80, "Secondary skill must be 80 characters or fewer."),
  tertiarySkill: z.string().trim().min(1, "Enter your tertiary skill.").max(80, "Tertiary skill must be 80 characters or fewer."),
  interests: z.array(z.string().trim().min(1).max(50, "Each interest must be 50 characters or fewer.")).min(1, "Enter at least one interest.").max(20, "Add no more than 20 interests."),
  location: z.string().trim().min(2, "Location must be at least 2 characters.").max(100, "Location must be 100 characters or fewer."),
  workMode: z.enum(["remote", "hybrid", "in_person"]),
  shareNetworkConnections: z.boolean().default(true),
  allowIntroductions: z.boolean().default(true),
});

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
    const [existing] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.email, email)).limit(1);
    const teen = existing?.ageBand === "teen_16_17";
    const rankedSkills = [input.primarySkill, input.secondarySkill, input.tertiarySkill];
    const [member] = await db.update(users).set({ profession: input.profession, headline: input.profession, industry: input.industry, bio: input.bio, primarySkill: input.primarySkill, secondarySkill: input.secondarySkill, tertiarySkill: input.tertiarySkill, skills: rankedSkills, interests: input.interests, location: teen ? null : input.location, workMode: input.workMode, status: "active", onboardingCompletedAt: new Date(), updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id, ageBand: users.ageBand });
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
