import { and, eq, gt, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectLeadershipElections, projectLeadershipVotes, projectMembers, projects, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { enforceRateLimit } from "@/lib/rate-limit";

const voteSchema = z.object({ electionId: z.string().uuid(), candidateId: z.string().uuid() });

export async function GET() {
  try {
    const member = await requireMember();
    const db = getDb();
    const now = new Date();
    const elections = await db.select({
      id: projectLeadershipElections.id,
      projectId: projectLeadershipElections.projectId,
      projectTitle: projects.title,
      electorate: projectLeadershipElections.electorate,
      deadline: projectLeadershipElections.deadline,
      membershipRole: projectMembers.membershipRole,
    }).from(projectLeadershipElections)
      .innerJoin(projects, eq(projects.id, projectLeadershipElections.projectId))
      .innerJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, member.id)))
      .where(and(eq(projectLeadershipElections.status, "open"), gt(projectLeadershipElections.deadline, now)));

    const visible = elections.filter(election => election.electorate === "members" ? election.membershipRole !== "former_owner" : election.membershipRole === "co_owner");
    const items = await Promise.all(visible.map(async election => {
      const roleFilter = election.electorate === "co_owners" ? eq(projectMembers.membershipRole, "co_owner") : ne(projectMembers.membershipRole, "former_owner");
      const candidates = await db.select({
        id: users.id,
        name: users.name,
        image: users.image,
        profession: users.profession,
        membershipRole: projectMembers.membershipRole,
      }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(and(
        eq(projectMembers.projectId, election.projectId),
        eq(users.status, "active"),
        roleFilter,
      ));
      const [vote] = await db.select({ candidateId: projectLeadershipVotes.candidateId }).from(projectLeadershipVotes).where(and(
        eq(projectLeadershipVotes.electionId, election.id),
        eq(projectLeadershipVotes.voterId, member.id),
      )).limit(1);
      return { ...election, membershipRole: undefined, candidates, selectedCandidateId: vote?.candidateId ?? null };
    }));
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember();
    enforceRateLimit(`leadership-vote:${member.id}`, 20, 60 * 60_000);
    await enforceDistributedRateLimit(`leadership-vote:${member.id}`, 20, 60 * 60_000);
    const input = voteSchema.parse(await request.json());
    const db = getDb();
    const now = new Date();
    const [election] = await db.select({
      id: projectLeadershipElections.id,
      projectId: projectLeadershipElections.projectId,
      electorate: projectLeadershipElections.electorate,
      voterRole: projectMembers.membershipRole,
    }).from(projectLeadershipElections)
      .innerJoin(projectMembers, and(eq(projectMembers.projectId, projectLeadershipElections.projectId), eq(projectMembers.userId, member.id)))
      .where(and(
        eq(projectLeadershipElections.id, input.electionId),
        eq(projectLeadershipElections.status, "open"),
        gt(projectLeadershipElections.deadline, now),
      )).limit(1);
    if (!election) throw new ApiError(404, "That leadership vote is no longer open.");
    const voterEligible = election.electorate === "co_owners" ? election.voterRole === "co_owner" : election.voterRole !== "former_owner";
    if (!voterEligible) throw new ApiError(403, "You are not eligible to vote in this leadership decision.");
    const [candidate] = await db.select({ role: projectMembers.membershipRole }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(and(
      eq(projectMembers.projectId, election.projectId),
      eq(projectMembers.userId, input.candidateId),
      eq(users.status, "active"),
    )).limit(1);
    const candidateEligible = candidate && (election.electorate === "co_owners" ? candidate.role === "co_owner" : candidate.role !== "former_owner");
    if (!candidateEligible) throw new ApiError(400, "That member is not eligible to lead this project.");
    await db.insert(projectLeadershipVotes).values({ electionId: election.id, voterId: member.id, candidateId: input.candidateId }).onConflictDoUpdate({
      target: [projectLeadershipVotes.electionId, projectLeadershipVotes.voterId],
      set: { candidateId: input.candidateId, updatedAt: now },
    });
    await audit(member.id, "project.leadership_vote_cast", "leadership_election", election.id, { candidateId: input.candidateId });
    return NextResponse.json({ success: true, selectedCandidateId: input.candidateId });
  } catch (error) {
    return apiError(error);
  }
}
