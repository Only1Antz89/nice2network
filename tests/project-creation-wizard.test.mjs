import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const industryPicker = readFileSync(new URL("../components/career-industry-input.tsx", import.meta.url), "utf8");

test("project creation separates details, planning, ownership, and recruitment into four numbered pages", () => {
  assert.match(page, /useState<0 \| 1 \| 2 \| 3 \| 4>/);
  assert.match(page, /Guided roadmap/);
  assert.match(page, /PROJECT OWNERSHIP/);
  assert.match(page, /Suggested recruitment/);
  assert.match(page, /Continue to ownership/);
  assert.match(page, /Continue to recruitment/);
  assert.match(page, /step < 4 \? `\$\{step \+ 1\}\/4` : "Review"/);
  assert.match(page, /onClick=\{\(\) => setStep\(0\)\}/);
  assert.match(page, /onClick=\{\(\) => setStep\(1\)\}/);
  assert.match(page, /onClick=\{\(\) => setStep\(2\)\}/);
  assert.match(page, /onClick=\{\(\) => setStep\(3\)\}/);
});

test("project planning call to action is encouraging and dark-mode safe", () => {
  assert.match(page, /Build my project plan/);
  assert.doesNotMatch(page, /Use 10–500 characters\./);
  assert.match(page, /summaryValidationAttempted && form\.summary\.trim\(\)\.length < 10/);
  assert.match(page, /Minimum 10 characters required\./);
  assert.match(page, /disabled=\{busy\}/);
  assert.match(page, /We couldn't build your project plan\. Check your connection and try again\./);
  assert.doesNotMatch(page, /Find the gaps/);
  assert.match(styles, /\.project-plan-button/);
  assert.match(styles, /\.project-modal \.ai-orbit/);
  assert.match(styles, /background:var\(--surface\)/);
  assert.match(styles, /\.project-plan-button,[\s\S]*background:#111;[\s\S]*color:#fff/);
  assert.match(styles, /\.publish-project-button[\s\S]*background:var\(--orange\)/);
  assert.doesNotMatch(page, /Build my project plan <N2Mark/);
});

test("details page orders image before summary and uses icon cards for stage and working style", () => {
  const title = page.indexOf("Project title");
  const image = page.indexOf("Add a project image", title);
  const summary = page.indexOf("Project summary", image);
  assert.ok(title >= 0 && image > title && summary > image);
  assert.match(page, /project-icon-choices four-up/);
  assert.match(page, /\["idea", "Idea", Lightbulb\]/);
  assert.match(page, /\["remote", "Remote", Globe2\]/);
  assert.match(page, /project-summary-industry/);
  assert.match(page, /project-summary-industry[\s\S]*ariaLabel="Industry"/);
  assert.doesNotMatch(page, /className="sr-only">Industry/);
  assert.match(styles, /project-summary-industry \.career-industry-control>input\{[^}]*height:34px[^}]*border-radius:8px[^}]*background:var\(--paper\)!important[^}]*color:var\(--ink\)!important/);
  assert.match(styles, /project-summary-footer \.field-limit\{[^}]*font-size:11px/);
  assert.match(page, /project-primary-owner[\s\S]*className="project-owner-slot"[\s\S]*project-owner-divider[\s\S]*project-owner-slots/);
  assert.doesNotMatch(page, /project-owner-slot fixed/);
  assert.doesNotMatch(page, /project-owner-slot primary/);
  assert.match(styles, /project-primary-owner>\.project-owner-slot\{position:static!important;inset:auto!important;width:100%;max-width:100%/);
  assert.match(styles, /project-owner-divider\{width:clamp\(96px,36%,160px\);height:1px/);
  assert.match(industryPicker, /aria-autocomplete="list"/);
  assert.doesNotMatch(industryPicker, /career-industry-prediction/);
});

test("roadmap and recruitment pages stay within the mobile wizard viewport", () => {
  assert.match(styles, /blueprint-roadmap input,[^}]*width:100%;[^}]*min-width:0;[^}]*max-width:100%/);
  assert.match(styles, /blueprint-roles input\{display:block;width:100%;min-width:0;max-width:100%/);
  assert.match(styles, /@media\(max-width:560px\)[\s\S]*blueprint-roadmap article>div>div\{grid-template-columns:minmax\(0,\.8fr\) minmax\(0,1\.5fr\) repeat\(3,32px\)/);
  assert.match(styles, /@media\(orientation:portrait\)[\s\S]*blueprint-roadmap article>div>div\{[\s\S]*grid-template-columns:minmax\(0,\.8fr\) minmax\(0,1\.4fr\) repeat\(3,44px\)/);
  assert.match(styles, /blueprint-role-head\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) 36px/);
});

test("remote fallback lives on recruitment, defaults off, and is persisted by approval", () => {
  assert.match(page, /allowRemoteFallback: false/);
  assert.match(page, /role="switch" aria-checked=\{form\.allowRemoteFallback\}/);
  assert.match(page, /allowRemoteFallback: form\.allowRemoteFallback/);
  assert.match(page, /project-recruitment-step[\s\S]*remote-fallback-switch[\s\S]*blueprint-roles/);
});
