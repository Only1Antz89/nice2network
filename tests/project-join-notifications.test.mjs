import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("project joins notify followed-update recipients and render branded celebration cards", async () => {
  const [service, applications, invitations, involvement, api, panel, page, card] = await Promise.all([
    read("lib/project-join-notifications.ts"),
    read("app/api/applications/[applicationId]/decision/route.ts"),
    read("app/api/invitations/[token]/respond/route.ts"),
    read("app/api/projects/[projectId]/involvement/[requestId]/route.ts"),
    read("app/api/notifications/route.ts"),
    read("components/notification-panel.tsx"),
    read("components/notifications-page.tsx"),
    read("components/project-join-notification-card.tsx"),
  ]);
  assert.match(service, /follows\.followingId, input\.userId/);
  assert.match(service, /!teammateIds\.has\(userId\)/);
  assert.match(service, /type: "following"/);
  assert.match(service, /entityType: "project_join"/);
  for (const route of [applications, invitations, involvement]) assert.match(route, /notifyProjectJoinFollowers/);
  assert.match(api, /projectJoin: item\.entityType === "project_join"/);
  assert.match(api, /p\.visibility = 'network'/);
  assert.match(api, /exists\(select 1 from follows/);
  assert.match(panel, /ProjectJoinNotificationCard/);
  assert.match(page, /ProjectJoinNotificationCard/);
  assert.match(card, /NEW PROJECT CHAPTER/);
  assert.match(card, /View project/);
});
