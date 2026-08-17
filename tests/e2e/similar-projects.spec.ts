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
}

test("pre-publish similarity is default-on, owner-only, role-aware and immediately disableable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Database mutation coverage runs once");
  test.skip(!databaseUrl, "POSTGRES_URL is required for database-backed API coverage");
  const sql = postgres(databaseUrl!, { prepare: false, max: 4 });
  const password = "SimilarProjects!2026", passwordHash = await hash(password, 10);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const sourceEmail = `similar-source-${suffix}@nice2.test`, targetEmail = `similar-target-${suffix}@nice2.test`;
  let sourceId: string | undefined, targetOwnerId: string | undefined, sourceProjectId: string | undefined, targetProjectId: string | undefined, targetRoleId: string | undefined;
  try {
    const [sourceOwner] = await sql`insert into users (name,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry,primary_skill,city,country,timezone,work_mode,availability,age_band) values ('Source Owner',${sourceEmail},now(),${passwordHash},'active',now(),'Product designer','Community services','Product design','London','United Kingdom','Europe/London','hybrid','open','adult') returning id`;
    const [targetOwner] = await sql`insert into users (name,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry,city,country,timezone,work_mode,age_band) values ('Target Owner',${targetEmail},now(),${passwordHash},'active',now(),'Community lead','Community services','London','United Kingdom','Europe/London','hybrid','adult') returning id`;
    sourceId = String(sourceOwner.id); targetOwnerId = String(targetOwner.id);
    const [sourceProject] = await sql`insert into projects (owner_id,title,summary,description,industry,stage,status,visibility,location,city,country,timezone,work_mode) values (${sourceId},'Neighbourhood repair and reuse hub','Repair household items locally and teach practical reuse skills.','A community workshop for repairs and reuse.','Community services','planning','draft','private','London, United Kingdom','London','United Kingdom','Europe/London','hybrid') returning id`;
    const [targetProject] = await sql`insert into projects (owner_id,title,summary,description,industry,stage,status,visibility,location,city,country,timezone,work_mode) values (${targetOwnerId},'Neighbourhood repair and reuse hub','Repair household items locally and teach practical reuse skills.','A community workshop for repairs and reuse.','Community services','building','active','network','London, United Kingdom','London','United Kingdom','Europe/London','hybrid') returning id`;
    sourceProjectId = String(sourceProject.id); targetProjectId = String(targetProject.id);
    await sql`insert into project_members (project_id,user_id,membership_role,department) values (${sourceProjectId},${sourceId},'owner','Leadership'),(${targetProjectId},${targetOwnerId},'owner','Leadership')`;
    const [targetRole] = await sql`insert into project_roles (project_id,title,department,professions,required_skills,useful_skills,phase,criticality,work_mode,capacity,filled,status) values (${targetProjectId},'Product designer','Product',array['Product designer'],array['Product design'],array['Community research'],'now','important','hybrid',2,0,'open') returning id`;
    targetRoleId = String(targetRole.id);
    await sql`insert into milestones (project_id,title,phase,status,sort_order,completed_at) values (${targetProjectId},'Open the first workshop','now','complete',0,now()),(${targetProjectId},'Grow the repair programme','next','in_progress',1,null)`;

    await signIn(page, sourceEmail, password);
    const body = { projectId: sourceProjectId, roles: [{ phase: "now", department: "Product", title: "Product designer", headcount: 2, professions: ["Product designer"], requiredSkills: ["Product design"], usefulSkills: ["Community research"], criticality: "important", reason: "Design the service with the local repair community.", workMode: "hybrid" }], milestones: [{ title: "Open the first workshop", phase: "now" }] };
    const enabled = await page.request.post("/api/projects/similarity/preview", { data: body });
    expect(enabled.status()).toBe(200);
    await expect(enabled.json()).resolves.toMatchObject({ enabled: true, suggestions: [{ projectId: targetProjectId, matchingRole: { title: "Product designer", openings: 2 } }] });

    await sql`update algorithm_settings set similar_project_suggestions_enabled=false where status='active'`;
    await sql`update projects set owner_id=${targetOwnerId} where id=${sourceProjectId}`;
    const forbidden = await page.request.post("/api/projects/similarity/preview", { data: body });
    expect(forbidden.status()).toBe(403);
    await sql`update projects set owner_id=${sourceId} where id=${sourceProjectId}`;

    const disabled = await page.request.post("/api/projects/similarity/preview", { data: body });
    expect(disabled.status()).toBe(200);
    await expect(disabled.json()).resolves.toEqual({ enabled: false, suggestions: [] });

    await sql`update algorithm_settings set similar_project_suggestions_enabled=true where status='active'`;
    await page.route("**/api/projects/drafts", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ project: { id: sourceProjectId } }) }));
    await page.route(`**/api/projects/${sourceProjectId}/blueprint`, route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ blueprint: { id: "11111111-1111-4111-8111-111111111111", outcome: "A focused local repair service with the right launch team.", assumptions: [], coveredContributions: [], milestones: [{ title: "Open the first workshop", phase: "now" }], gaps: [], risks: [], roles: body.roles, provider: "rules" } }) }));
    await page.route(`**/api/projects/${sourceProjectId}/blueprint/*/approve`, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, projectId: sourceProjectId }) }));
    await page.getByRole("button", { name: "Start a project" }).click();
    await page.getByLabel("Project title").fill("Neighbourhood repair and reuse hub");
    await page.getByLabel("Project summary").fill("x".repeat(500));
    await expect(page.getByText("500/500")).toBeVisible();
    await expect(page.getByRole("button", { name: "Build my project plan" })).toBeEnabled();
    await page.getByPlaceholder("Describe the idea, why it matters, and where you'd like help…").fill("Repair household items locally and teach practical reuse skills.");
    await page.getByRole("button", { name: "Build my project plan" }).click();
    await expect(page.getByText("Guided roadmap", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Project title")).toHaveValue("Neighbourhood repair and reuse hub");
    await page.getByRole("button", { name: "Build my project plan" }).click();
    await page.getByRole("button", { name: "Continue to recruitment" }).click();
    await expect(page.getByText("Suggested recruitment", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Guided roadmap", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue to recruitment" }).click();
    await page.getByRole("button", { name: "Review matches & publish" }).click();
    await expect(page.getByRole("heading", { name: "Similar work is already underway" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Neighbourhood repair and reuse hub", level: 3 })).toBeVisible();
    await expect(page.getByRole("link", { name: "View matching role" })).toHaveAttribute("href", new RegExp(`project=${targetProjectId}.*role=${targetRoleId}`));
    await page.getByRole("button", { name: "Continue with my project" }).click();
    await expect(page.getByText("Project published — useful matches are being notified.")).toBeVisible();

    await page.goto(`/?project=${targetProjectId}&role=${targetRoleId}`);
    await expect(page.getByRole("heading", { name: "Apply for Product designer" })).toBeVisible();
  } finally {
    await sql`update algorithm_settings set similar_project_suggestions_enabled=true where status='active'`;
    if (sourceProjectId || targetProjectId) await sql`delete from projects where id in (${sourceProjectId ?? null},${targetProjectId ?? null})`;
    if (sourceId || targetOwnerId) await sql`delete from users where id in (${sourceId ?? null},${targetOwnerId ?? null})`;
    await sql.end();
  }
});
