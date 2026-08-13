import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { milestones, projectMembers, projectRoles, projects, projectUpdates, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

async function requireOwner(userId: string, projectId: string) {
  const [row] = await getDb().select({ project: projects }).from(projects).leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId))).where(and(eq(projects.id, projectId), or(eq(projects.ownerId, userId), eq(projectMembers.membershipRole, "co_owner")))).limit(1);
  if (!row) throw new ApiError(403, "Only a project owner can do that");
  return row.project;
}

export async function GET(_:Request,{params}:{params:Promise<{projectId:string}>}){
  try{
    const member=await requireMember(),{projectId}=await params,db=getDb();
    const [project]=await db.select({id:projects.id,ownerId:projects.ownerId,title:projects.title,summary:projects.summary,description:projects.description,imageUrl:projects.imageUrl,industry:projects.industry,stage:projects.stage,status:projects.status,visibility:projects.visibility,workMode:projects.workMode,location:projects.location,accent:projects.accent,createdAt:projects.createdAt,completedAt:projects.completedAt,ownerName:users.name,ownerImage:users.image,ownerProfession:users.profession}).from(projects).innerJoin(users,eq(users.id,projects.ownerId)).where(eq(projects.id,projectId)).limit(1);
    if(!project||project.status==="deleted")throw new ApiError(404,"Project not found");
    const [membership]=await db.select({role:projectMembers.membershipRole}).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,member.id))).limit(1);
    if(project.visibility==="private"&&project.ownerId!==member.id&&!membership)throw new ApiError(403,"This project is private");
    const [team,roles,roadmap,updates]=await Promise.all([
      db.select({userId:projectMembers.userId,name:users.name,image:users.image,profession:users.profession,membershipRole:projectMembers.membershipRole,department:projectMembers.department,joinedAt:projectMembers.joinedAt}).from(projectMembers).innerJoin(users,eq(users.id,projectMembers.userId)).where(eq(projectMembers.projectId,projectId)).orderBy(asc(projectMembers.joinedAt)),
      db.select().from(projectRoles).where(eq(projectRoles.projectId,projectId)).orderBy(asc(projectRoles.createdAt)),
      db.select().from(milestones).where(eq(milestones.projectId,projectId)).orderBy(asc(milestones.sortOrder),asc(milestones.createdAt)),
      db.select({id:projectUpdates.id,milestoneId:projectUpdates.milestoneId,type:projectUpdates.type,body:projectUpdates.body,attachmentType:projectUpdates.attachmentType,attachmentUrl:projectUpdates.attachmentUrl,attachmentName:projectUpdates.attachmentName,updatedAt:projectUpdates.updatedAt,createdAt:projectUpdates.createdAt,authorId:projectUpdates.authorId,authorName:users.name,authorImage:users.image}).from(projectUpdates).innerJoin(users,eq(users.id,projectUpdates.authorId)).where(and(eq(projectUpdates.projectId,projectId),eq(projectUpdates.status,"visible"))).orderBy(desc(projectUpdates.createdAt)).limit(100),
    ]);
    return NextResponse.json({project:{...project,currentUserId:member.id,isMember:Boolean(membership)||project.ownerId===member.id,isOwner:project.ownerId===member.id||membership?.role==="co_owner",team,roles,milestones:roadmap,updates}});
  }catch(error){return apiError(error)}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = z.object({ title: z.string().trim().min(4).max(120).optional(), summary: z.string().trim().min(20).max(300).optional(), visibility: z.enum(["network", "connections", "private"]).optional() }).refine(value => Object.keys(value).length > 0).parse(await request.json());
    const before = await requireOwner(member.id, projectId);
    const [project] = await getDb().update(projects).set({ ...input, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();
    after(() => recomputeProjectRecommendations(projectId));
    await audit(member.id, "project.updated", "project", projectId, {}, { before: { title: before.title, summary: before.summary, visibility: before.visibility }, after: input });
    return NextResponse.json({ project });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireOwner(member.id, projectId);
    await getDb().update(projects).set({ status: "deleted", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await audit(member.id, "project.deleted", "project", projectId);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
