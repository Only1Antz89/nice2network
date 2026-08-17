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

test("roadmap APIs enforce ownership and allocate concurrent positions safely", async ({ browser, page }, testInfo) => {
  test.skip(!databaseUrl, "POSTGRES_URL is required for database-backed API coverage");
  const sql = postgres(databaseUrl!, { prepare: false, max: 4 });
  const password = "RoadmapIntegrity!2026";
  const passwordHash = await hash(password, 10);
  const suffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `roadmap-owner-${suffix}@nice2.test`;
  const outsiderEmail = `roadmap-outsider-${suffix}@nice2.test`;
  let projectId: string | undefined;
  let ownerId: string | undefined;
  const outsiderContext = await browser.newContext();

  try {
    const [owner] = await sql`insert into users (name,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry) values ('Roadmap Owner',${ownerEmail},now(),${passwordHash},'active',now(),'Product lead','Technology') returning id`;
    ownerId = String(owner.id);
    await sql`insert into users (name,email,email_verified,password_hash,status,onboarding_completed_at,profession,industry) values ('Roadmap Outsider',${outsiderEmail},now(),${passwordHash},'active',now(),'Designer','Technology')`;
    const [project] = await sql`insert into projects (owner_id,title,summary,industry,status,visibility) values (${ownerId},'Concurrent roadmap test','A database-backed project for testing safe concurrent roadmap changes.','Technology','active','network') returning id`;
    projectId = String(project.id);
    await sql`insert into project_members (project_id,user_id,membership_role,department) values (${projectId},${ownerId},'owner','Leadership')`;

    await signIn(page, ownerEmail, password);
    const outsiderPage = await outsiderContext.newPage();
    await signIn(outsiderPage, outsiderEmail, password);

    const forbidden = await outsiderPage.request.post(`/api/projects/${projectId}/milestones`, { data: { title: "Unauthorized step", phase: "now" } });
    expect(forbidden.status()).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({ error: "Only project owners can edit the roadmap" });

    const [first, second] = await Promise.all([
      page.request.post(`/api/projects/${projectId}/milestones`, { data: { title: "Concurrent step one", phase: "now" } }),
      page.request.post(`/api/projects/${projectId}/milestones`, { data: { title: "Concurrent step two", phase: "next" } }),
    ]);
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);

    const positions = await sql`select title,sort_order from milestones where project_id=${projectId} order by sort_order` as Array<{ title: string; sort_order: number }>;
    expect(positions.map((row) => row.sort_order)).toEqual([0, 1]);
    expect(new Set(positions.map((row) => row.title))).toEqual(new Set(["Concurrent step one", "Concurrent step two"]));
  } finally {
    await outsiderContext.close();
    if (projectId) await sql`delete from projects where id=${projectId}`;
    // Audit records are intentionally append-only, so their seeded actors remain
    // in this disposable test database until the tmpfs container is removed.
    await sql.end();
  }
});
