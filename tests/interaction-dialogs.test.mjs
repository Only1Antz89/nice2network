import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("interactive flows use accessible in-product dialogs instead of browser prompts", async () => {
  const [page, actionDialog, peoplePanel] = await Promise.all([
    read("app/page.tsx"),
    read("components/action-dialog.tsx"),
    read("components/people-discovery-panel.tsx"),
  ]);

  assert.doesNotMatch(page, /window\.(?:prompt|confirm)/);
  assert.doesNotMatch(peoplePanel, /window\.(?:prompt|confirm)/);
  assert.match(actionDialog, /role="dialog"/);
  assert.match(actionDialog, /aria-modal="true"/);
  assert.match(page, /EDIT MESSAGE/);
  assert.match(page, /DELETE UPDATE/);
  assert.match(page, /REPORT POST/);
});

test("people discovery is isolated from the home page module", async () => {
  const [page, panel] = await Promise.all([
    read("app/page.tsx"),
    read("components/people-discovery-panel.tsx"),
  ]);

  assert.match(page, /import PeopleDiscoveryPanel from "@\/components\/people-discovery-panel"/);
  assert.doesNotMatch(page, /function PeopleDiscoveryPanel\(/);
  assert.match(panel, /export default function PeopleDiscoveryPanel/);
});
