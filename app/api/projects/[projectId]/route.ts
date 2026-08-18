import { and, asc, desc, eq, or } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, milestones, projectFollows, projectInvolvementRequests, projectMembers, projectRoles, projects, projectUpdates, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";
import { ensureProjectEmbedding } from "@/lib/recommendations/project-similarity";
import { requireProjectView } from "@/lib/content-access";

const normaliseFitValue=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g," ");
const fits=(candidate:string,target:string)=>{const a=normaliseFitValue(candidate),b=normaliseFitValue(target);return Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)))};
function applicationFit(row:{applicantProfession:string|null;applicantSkills:string[];roleProfessions:string[];roleRequiredSkills:string[];roleUsefulSkills:string[];roleTitle:string;roleDepartment:string}){
  const skills=row.applicantSkills.filter(Boolean),professionTargets=row.roleProfessions.length?row.roleProfessions:[row.roleTitle,row.roleDepartment],professionMatch=Boolean(row.applicantProfession&&professionTargets.some(target=>fits(row.applicantProfession!,target))),requiredMatches=row.roleRequiredSkills.filter(target=>skills.some(skill=>fits(skill,target))),usefulMatches=row.roleUsefulSkills.filter(target=>skills.some(skill=>fits(skill,target)));
  const parts=[{weight:30,active:professionTargets.length>0,value:professionMatch?1:0},{weight:50,active:row.roleRequiredSkills.length>0,value:row.roleRequiredSkills.length?requiredMatches.length/row.roleRequiredSkills.length:0},{weight:20,active:row.roleUsefulSkills.length>0,value:row.roleUsefulSkills.length?usefulMatches.length/row.roleUsefulSkills.length:0}],active=parts.filter(part=>part.active),total=active.reduce((sum,part)=>sum+part.weight,0),score=total?Math.round(active.reduce((sum,part)=>sum+part.weight*part.value,0)/total*100):50;
  return {score,professionMatch,requiredMatches,usefulMatches};
}

async function requireOwner(userId: string, projectId: string) {
  const [row] = await getDb().select({ project: projects }).from(projects).leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId))).where(and(eq(projects.id, projectId), or(eq(projects.ownerId, userId), eq(projectMembers.membershipRole, "co_owner")))).limit(1);
  if (!row) throw new ApiError(403, "Only a project owner can do that");
  return row.project;
}

export async function GET(_:Request,{params}:{params:Promise<{projectId:string}>}){
  try{
    const member=await requireMember(),{projectId}=await params,db=getDb();
    await requireProjectView(member.id, projectId);
    const [project]=await db.select({id:projects.id,ownerId:projects.ownerId,title:projects.title,summary:projects.summary,description:projects.description,imageUrl:projects.imageUrl,industry:projects.industry,stage:projects.stage,status:projects.status,visibility:projects.visibility,workMode:projects.workMode,location:projects.location,accent:projects.accent,createdAt:projects.createdAt,completedAt:projects.completedAt,ownerName:users.name,ownerImage:users.image,ownerProfession:users.profession}).from(projects).innerJoin(users,eq(users.id,projects.ownerId)).where(eq(projects.id,projectId)).limit(1);
    if(!project||project.status==="deleted")throw new ApiError(404,"Project not found");
    const [membership]=await db.select({role:projectMembers.membershipRole}).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,member.id))).limit(1);
    const isOwner=project.ownerId===member.id||membership?.role==="co_owner";
    const [team,roles,roadmap,updates,followRows,involvementRows,applicationRows]=await Promise.all([
      db.select({userId:projectMembers.userId,name:users.name,image:users.image,profession:users.profession,membershipRole:projectMembers.membershipRole,department:projectMembers.department,joinedAt:projectMembers.joinedAt}).from(projectMembers).innerJoin(users,eq(users.id,projectMembers.userId)).where(eq(projectMembers.projectId,projectId)).orderBy(asc(projectMembers.joinedAt)),
      db.select().from(projectRoles).where(eq(projectRoles.projectId,projectId)).orderBy(asc(projectRoles.createdAt)),
      db.select().from(milestones).where(eq(milestones.projectId,projectId)).orderBy(asc(milestones.sortOrder),asc(milestones.createdAt)),
      db.select({id:projectUpdates.id,milestoneId:projectUpdates.milestoneId,type:projectUpdates.type,body:projectUpdates.body,attachmentType:projectUpdates.attachmentType,attachmentUrl:projectUpdates.attachmentUrl,attachmentName:projectUpdates.attachmentName,updatedAt:projectUpdates.updatedAt,createdAt:projectUpdates.createdAt,authorId:projectUpdates.authorId,authorName:users.name,authorImage:users.image}).from(projectUpdates).innerJoin(users,eq(users.id,projectUpdates.authorId)).where(and(eq(projectUpdates.projectId,projectId),eq(projectUpdates.status,"visible"))).orderBy(desc(projectUpdates.createdAt)).limit(100),
      db.select({id:projectFollows.userId}).from(projectFollows).where(and(eq(projectFollows.projectId,projectId),eq(projectFollows.userId,member.id))).limit(1),
      db.select({status:projectInvolvementRequests.status}).from(projectInvolvementRequests).where(and(eq(projectInvolvementRequests.projectId,projectId),eq(projectInvolvementRequests.userId,member.id))).limit(1),
      isOwner
        ? db.select({id:applications.id,status:applications.status,message:applications.message,createdAt:applications.createdAt,applicantId:users.id,applicantName:users.name,applicantImage:users.image,applicantProfession:users.profession,applicantHeadline:users.headline,applicantBio:users.bio,applicantLocation:users.location,applicantPrimarySkill:users.primarySkill,applicantSecondarySkill:users.secondarySkill,applicantTertiarySkill:users.tertiarySkill,applicantSkills:users.skills,applicantInterests:users.interests,roleId:projectRoles.id,roleTitle:projectRoles.title,roleDepartment:projectRoles.department,roleProfessions:projectRoles.professions,roleRequiredSkills:projectRoles.requiredSkills,roleUsefulSkills:projectRoles.usefulSkills}).from(applications).innerJoin(users,eq(users.id,applications.applicantId)).innerJoin(projectRoles,eq(projectRoles.id,applications.roleId)).where(eq(applications.projectId,projectId)).orderBy(desc(applications.createdAt))
        : Promise.resolve([]),
    ]);
    const enrichedApplications=applicationRows.map(row=>{const applicantSkills=[row.applicantPrimarySkill,row.applicantSecondarySkill,row.applicantTertiarySkill,...row.applicantSkills].filter((value):value is string=>Boolean(value));return {...row,applicantSkills:[...new Set(applicantSkills)],profileBrief:row.applicantHeadline||row.applicantBio||row.applicantProfession||"This member has not added a profile brief yet.",fit:applicationFit({...row,applicantSkills})}});
    return NextResponse.json({project:{...project,currentUserId:member.id,isMember:Boolean(membership)||project.ownerId===member.id,isOwner,membershipRole:membership?.role??(project.ownerId===member.id?"owner":null),isFollowingProject:Boolean(followRows[0]),involvementStatus:involvementRows[0]?.status??null,team,roles,milestones:roadmap,updates,applications:enrichedApplications,pendingApplicationCount:enrichedApplications.filter(item=>item.status==="pending").length}});
  }catch(error){return apiError(error)}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = z.object({ title: z.string().trim().min(4).max(120).optional(), summary: z.string().trim().min(10).max(500).optional(), industry:z.string().trim().min(2).max(80).optional(), stage: z.enum(["idea", "planning", "building", "launching"]).optional(), visibility: z.enum(["network", "connections", "private"]).optional() }).refine(value => Object.keys(value).length > 0).parse(await request.json());
    const before = await requireOwner(member.id, projectId);
    const [project] = await getDb().update(projects).set({ ...input, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();
    after(async () => { await Promise.allSettled([recomputeProjectRecommendations(projectId), ensureProjectEmbedding(projectId)]); });
    await audit(member.id, "project.updated", "project", projectId, {}, { before: { title: before.title, summary: before.summary, stage: before.stage, visibility: before.visibility }, after: input });
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
