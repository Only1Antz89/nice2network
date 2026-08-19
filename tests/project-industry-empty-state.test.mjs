import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("new projects start with a clear industry choice", () => {
  assert.match(page, /industry: "",\s+stage: "idea"/);
  assert.match(page, /placeholder="Type or choose an industry"/);
  assert.match(page, /Required\. Start typing or choose a suggestion\./);
  assert.match(page, /Type or choose an industry before building your project plan\./);
});
