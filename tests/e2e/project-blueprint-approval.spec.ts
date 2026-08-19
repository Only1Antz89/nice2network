import { expect, test, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  const cookieChoice = page.getByRole("button", { name: "Essential only" });
  if (await cookieChoice.isVisible()) await cookieChoice.click();
}

test("real blueprint approval is atomic and creates the published project plan", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Database mutation coverage runs once");
  test.skip(!databaseUrl, "POSTGRES_URL is required for database-backed API coverage");

  const sql = postgres(databaseUrl!, { prepare: false, max: 4 });
  const password = "BlueprintApproval!2026";
  const passwordHash = await hash(password, 10);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `approval-owner-${suffix}@nice2.test`;
  let ownerId: string | undefined;
  let projectId: string | undefined;
  let blueprintId: string | undefined;

  const role = {
    phase: "now",
    department: "Engineering",
    title: "Software engineer",
    headcount: 1,
    professions: ["Software engineer"],
    requiredSkills: ["TypeScript"],
    usefulSkills: ["Product development"],
    criticality: "critical",
    reason: "Build and test the first useful version of the product.",
    workMode: "remote",
  };

  try {
    const [owner] = await sql`insert into users (name,username,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry,primary_skill,city,country,timezone,work_mode,availability,age_band) values ('Approval Owner',${`approval-owner-${suffix}`},${ownerEmail},now(),${passwordHash},'active',now(),'Product lead','Technology','Product development','London','United Kingdom','Europe/London','remote','open','adult') returning id`;
    await sql`insert into users (name,username,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry,primary_skill,skills,city,country,timezone,work_mode,availability,age_band) values ('Approval Candidate',${`approval-candidate-${suffix}`},${`approval-candidate-${suffix}@nice2.test`},now(),${passwordHash},'active',now(),'Software engineer','Technology','TypeScript',array['TypeScript','Product development'],'London','United Kingdom','Europe/London','remote','open','adult')`;
    ownerId = String(owner.id);

    const [project] = await sql`insert into projects (owner_id,title,summary,description,industry,stage,status,visibility,location,city,country,timezone,work_mode,allow_remote_fallback) values (${ownerId},'Atomic approval project','Build and test a useful product with a focused technical team.','A real API approval regression fixture.','Technology','planning','draft','private','London, United Kingdom','London','United Kingdom','Europe/London','remote',false) returning id`;
    projectId = String(project.id);
    await sql`insert into project_members (project_id,user_id,membership_role,department) values (${projectId},${ownerId},'owner','Leadership')`;
    const [blueprint] = await sql`insert into project_blueprints (project_id,version,status,provider,model,input_hash,outcome,milestones,roles) values (${projectId},1,'draft','rules','test-fixture',${`approval-${suffix}`},'Launch a useful first version with a focused engineering contribution.',${sql.json([{ title: "Ship the first version", phase: "now" }])},${sql.json([role])}) returning id`;
    blueprintId = String(blueprint.id);

    await signIn(page, ownerEmail, password);
    const endpoint = `/api/projects/${projectId}/blueprint/${blueprintId}/approve`;

    const failed = await page.request.post(endpoint, { data: { roles: [], milestones: [{ title: "Ship the first version", phase: "now" }], visibility: "network", allowRemoteFallback: true, coOwnerIds: [] } });
    expect(failed.status()).toBe(400);
    const [afterFailure] = await sql`select p.status,p.allow_remote_fallback,b.status as blueprint_status,(select count(*)::int from project_roles r where r.project_id=p.id) as role_count,(select count(*)::int from milestones m where m.project_id=p.id) as milestone_count from projects p join project_blueprints b on b.project_id=p.id where p.id=${projectId}`;
    expect(afterFailure).toMatchObject({ status: "draft", allow_remote_fallback: false, blueprint_status: "draft", role_count: 0, milestone_count: 0 });

    const approved = await page.request.post(endpoint, { data: { roles: [role], milestones: [{ title: "Ship the first version", description: "Release and verify the core workflow.", phase: "now", ownerId, dueAt: null }], visibility: "network", allowRemoteFallback: true, coOwnerIds: [] } });
    expect(approved.status()).toBe(200);
    await expect(approved.json()).resolves.toMatchObject({ success: true, projectId });

    const [published] = await sql`select p.status,p.visibility,p.allow_remote_fallback,b.status as blueprint_status,(select count(*)::int from project_roles r where r.project_id=p.id) as role_count,(select count(*)::int from milestones m where m.project_id=p.id) as milestone_count,(select count(*)::int from project_recommendations pr where pr.project_id=p.id and pr.status='active') as recommendation_count from projects p join project_blueprints b on b.project_id=p.id where p.id=${projectId}`;
    expect(published.status).toBe("active");
    expect(published.visibility).toBe("network");
    expect(published.allow_remote_fallback).toBe(true);
    expect(published.blueprint_status).toBe("approved");
    expect(published.role_count).toBe(1);
    expect(published.milestone_count).toBe(1);
    expect(published.recommendation_count).toBeGreaterThanOrEqual(1);
  } finally {
    if (projectId) await sql`delete from projects where id=${projectId}`;
    // Audit records are deliberately append-only, so disposable E2E users remain
    // until the tmpfs-backed test database is torn down.
    await sql.end();
  }
});
