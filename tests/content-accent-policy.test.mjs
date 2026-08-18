import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("app/page.tsx");
const css = read("app/globals.css");
const publicProfileCss = read("app/[username]/public-profile.module.css");
const projectRoute = read("app/api/projects/route.ts");
const draftRoute = read("app/api/projects/drafts/route.ts");
const sharedContent = read("lib/shared-content.ts");
const sharedImage = read("app/share/[kind]/[id]/opengraph-image.tsx");

test("project creation uses the canonical orange accent without a user selector", () => {
  assert.doesNotMatch(app, /Timeline accent/);
  assert.doesNotMatch(app, /form\.accent/);
  assert.doesNotMatch(projectRoute, /accent:\s*z\.string/);
  assert.doesNotMatch(draftRoute, /accent:\s*z\.string/);
  assert.match(projectRoute, /accent:\s*PROJECT_ACCENT/);
  assert.match(draftRoute, /accent:\s*PROJECT_ACCENT/);
});

test("rendered projects and meets use their canonical brand accents", () => {
  assert.match(css, /\.project-accent,\.project-blue \.project-accent\{background:var\(--orange\)\}/);
  assert.match(css, /\.meet-card\{border-top:4px solid var\(--green\)\}/);
  assert.match(css, /\.saved-content-card\.saved-project\{border-top-color:var\(--orange\)\}/);
  assert.match(css, /\.saved-content-card\.saved-meeting\{border-top:4px solid var\(--green\)\}/);
  assert.match(publicProfileCss, /\.projectVisual\{background:var\(--orange\)\}/);
});

test("posts stay neutral while shared projects retain orange", () => {
  assert.match(sharedContent, /kind:\s*"post"[\s\S]*?accent:\s*null/);
  assert.match(sharedContent, /kind:\s*"project"[\s\S]*?accent:\s*PROJECT_ACCENT/);
  assert.match(css, /\.shared-content-page>article\{border-top-width:1px\}/);
  assert.match(css, /\.shared-content-page>article\.shared-project\{border-top:8px solid var\(--orange\)\}/);
  assert.match(sharedImage, /content\.accent&&<span/);
});
