import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() { try { const admin = await requirePermission("projects.manage"); const rows = await getDb().select({ id: projects.id, title: projects.title, industry: projects.industry, stage: projects.stage, status: projects.status, ownerName: users.name, createdAt: projects.createdAt }).from(projects).innerJoin(users, eq(users.id, projects.ownerId)).orderBy(desc(projects.createdAt)).limit(100); await audit(admin.user.id, "admin.projects_viewed", "project", undefined, {}, { permission: "projects.manage" }); return NextResponse.json({ projects: rows }); } catch (error) { return apiError(error); } }
