import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectRoles, projects, users, verificationTokens } from "@/db/schema";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({
  profession: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(2).max(100),
  bio: z.string().trim().min(10).max(600),
  primarySkill: z.string().trim().min(1).max(80),
  secondarySkill: z.string().trim().min(1).max(80),
  tertiarySkill: z.string().trim().min(1).max(80),
  interests: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
  location: z.string().trim().min(2).max(100),
  workMode: z.enum(["remote", "hybrid", "in_person"]),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
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

    await trackProductEvent({ actorId: member.id, ageBand: member.ageBand, event: "onboarding_completed", entityType: "user", entityId: member.id });
    const candidates = await db.select({ id: users.id, name: users.name, image: users.image, profession: users.profession, skills: users.skills, interests: users.interests, location: users.location, ageBand: users.ageBand }).from(users).where(and(ne(users.email, email), eq(users.status, "active"))).limit(30);
    const norm = (value: string) => value.trim().toLowerCase();
    const skills = new Set(rankedSkills.map(norm));
    const interests = new Set(input.interests.map(norm));
    const network = candidates.filter((candidate) => !teen || candidate.ageBand === "teen_16_17").map((candidate) => {
      const sharedSkills = candidate.skills.filter((value) => skills.has(norm(value)));
      const sharedInterests = candidate.interests.filter((value) => interests.has(norm(value)));
      const professionFit = candidate.profession && norm(candidate.profession).includes(norm(input.profession).split(" ")[0]) ? 2 : 0;
      const locationFit = candidate.location && norm(candidate.location) === norm(input.location) ? 1 : 0;
      return { ...candidate, sharedSkills, sharedInterests, score: sharedSkills.length * 3 + sharedInterests.length * 2 + professionFit + locationFit };
    }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);

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
