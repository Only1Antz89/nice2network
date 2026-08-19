import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { mergeNewestTimeline } from "../lib/newest-timeline.ts";

test("newest timeline interleaves members, posts and projects by timestamp", () => {
  const result = mergeNewestTimeline({
    members: [{ id: "member-2", createdAt: "2026-08-18T08:00:00Z" }],
    posts: [
      { id: "post-1", createdAt: "2026-08-18T10:00:00Z" },
      { id: "post-2", createdAt: "2026-08-18T06:00:00Z" },
    ],
    projects: [{ id: "project-1", createdAt: "2026-08-18T09:00:00Z" }],
  });

  assert.deepEqual(
    result.map(({ kind, item }) => `${kind}:${item.id}`),
    ["post:post-1", "project:project-1", "member:member-2", "post:post-2"],
  );
});

test("Feed renders new joiners through the same unified newest timeline", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /mergeNewestTimeline\(\{\s*members: newJoiners,\s*posts,\s*projects: liveProjects,/s);
  assert.match(source, /timelineFeed\.map\(\(entry\) => \{\s*if \(entry\.kind === "member"\)/s);
  assert.doesNotMatch(source, /filter === "Newest" &&\s*newJoiners\.map/);
});

test("a newly published project is handed directly into the feed and survives refresh", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /newProject: ProjectRecord \| null/);
  assert.match(source, /newProject=\{latestProject\}/);
  assert.match(source, /if \(newProject && filter === "Newest"\)\s*setLiveProjects\(\(rows\) => \[\s*newProject,\s*\.\.\.rows\.filter\(\(row\) => row\.id !== newProject\.id\)/s);
  assert.match(source, /fetch\(projectQuery\(\), \{ signal: controller\.signal, cache: "no-store" \}\)/);
  assert.match(source, /newProject && filter === "Newest"/);
  assert.match(source, /\[newProject, \.\.\.projects\.filter\(\(project\) => project\.id !== newProject\.id\)\]/);
});
