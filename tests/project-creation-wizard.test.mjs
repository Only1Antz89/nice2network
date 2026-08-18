import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("project creation separates planning and recruitment into editable steps", () => {
  assert.match(page, /useState<0 \| 1 \| 2 \| 3>/);
  assert.match(page, /Guided roadmap/);
  assert.match(page, /Suggested recruitment/);
  assert.match(page, /Continue to recruitment/);
  assert.match(page, /onClick=\{\(\) => setStep\(0\)\}/);
  assert.match(page, /onClick=\{\(\) => setStep\(1\)\}/);
});

test("project planning call to action is encouraging and dark-mode safe", () => {
  assert.match(page, /Build my project plan/);
  assert.match(page, /Use 10–500 characters\./);
  assert.match(page, /disabled=\{busy\}/);
  assert.match(page, /We couldn't build your project plan\. Check your connection and try again\./);
  assert.doesNotMatch(page, /Find the gaps/);
  assert.match(styles, /\.project-plan-button/);
  assert.match(styles, /\.project-modal \.ai-orbit/);
  assert.match(styles, /background:var\(--surface\)/);
});
