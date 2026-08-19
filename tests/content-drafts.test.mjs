import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("draft persistence is private, typed, and summary-only when listed", async () => {
  const [schema, collection, item, definitions] = await Promise.all([
    read("db/schema.ts"), read("app/api/drafts/route.ts"), read("app/api/drafts/[draftId]/route.ts"), read("lib/content-drafts.ts"),
  ]);
  assert.match(schema, /contentDrafts = pgTable\("content_drafts"/);
  assert.match(schema, /content_drafts_owner_kind_idx/);
  assert.match(collection, /requireMember\(\)/);
  assert.match(collection, /ownerId, member\.id/);
  assert.match(collection, /payload: z\.unknown/);
  assert.match(collection, /title: contentDrafts\.title/);
  assert.doesNotMatch(collection, /payload: contentDrafts\.payload/);
  assert.match(item, /Draft not found/);
  assert.match(item, /eq\(projects\.status, "draft"\)/);
  assert.match(definitions, /projectDraftPayloadSchema/);
  assert.match(definitions, /postDraftPayloadSchema/);
  assert.match(definitions, /step: z\.number\(\)\.int\(\)\.min\(0\)\.max\(4\)/);
  assert.match(definitions, /allowRemoteFallback: z\.boolean\(\)\.default\(false\)/);
});

test("post and project publication consume only owned drafts", async () => {
  const [posts, approval, service] = await Promise.all([
    read("app/api/posts/route.ts"), read("app/api/projects/[projectId]/blueprint/[blueprintId]/approve/route.ts"), read("lib/recommendations/service.ts"),
  ]);
  assert.match(posts, /draftId: z\.uuid\(\)\.optional/);
  assert.match(posts, /eq\(contentDrafts\.ownerId, member\.id\)/);
  assert.match(posts, /db\.transaction/);
  assert.match(approval, /draftId: z\.uuid\(\)\.optional/);
  assert.match(service, /eq\(contentDrafts\.projectId, input\.projectId\)/);
  assert.match(service, /tx\.delete\(contentDrafts\)/);
});

test("creation UI uses explicit server drafts without a persistent browser cache", async () => {
  const [page, hook, styles] = await Promise.all([
    read("app/page.tsx"), read("lib/use-content-draft.ts"), read("app/globals.css"),
  ]);
  assert.match(page, /kind: "project", initialDraft, payload: projectDraftPayload/);
  assert.match(page, /kind: "post", initialDraft, payload: postDraftPayload/);
  assert.match(page, /<ContentDraftList kind="post" compact/);
  assert.match(page, /<ContentDraftList kind="project"/);
  assert.match(page, /Project saved to drafts\./);
  assert.match(page, /Post saved to drafts\./);
  assert.match(hook, /export function useContentDraft/);
  assert.match(hook, /const discard = useCallback/);
  assert.doesNotMatch(hook, /indexedDB|pagehide|visibilitychange|setTimeout/);
  assert.doesNotMatch(page, /listBufferedDrafts|clearBufferedDraft|draftSummary/);
  assert.match(page, /Could not remove this empty post draft/);
  assert.match(styles, /\.content-draft-list/);
  assert.match(styles, /\.draft-save-status/);
});

test("migration backfills existing private project records", async () => {
  const migration = await read("drizzle/0033_square_lucky_pierre.sql");
  assert.match(migration, /INSERT INTO "content_drafts"/);
  assert.match(migration, /WHERE p\."status" = 'draft'/);
  assert.match(migration, /ON CONFLICT \("project_id"\) DO NOTHING/);
});
