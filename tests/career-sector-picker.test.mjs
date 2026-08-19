import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const taxonomy = readFileSync(new URL("../lib/career-sectors.ts", import.meta.url), "utf8");
const picker = readFileSync(new URL("../components/career-industry-input.tsx", import.meta.url), "utf8");

test("career taxonomy covers broad sectors and familiar careers", () => {
  const sectors = [...taxonomy.matchAll(/sector: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(sectors.length >= 25);
  assert.equal(new Set(sectors).size, sectors.length);
  for (const career of ["Software engineer", "Paramedic", "Teacher", "Accountant", "Electrician", "Chef", "Civil servant"]) {
    assert.match(taxonomy, new RegExp(`"${career}"`));
  }
});

test("industry picker uses list-only autocomplete without ghost completion", () => {
  assert.match(picker, /aria-autocomplete="list"/);
  assert.match(picker, /autoComplete="off"/);
  assert.match(picker, /autoCorrect="off"/);
  assert.doesNotMatch(picker, /career-industry-prediction/);
  assert.match(picker, /<mark>/);
  assert.match(picker, /event\.key === "Enter"/);
  assert.doesNotMatch(picker, /event\.key === "Tab" \|\| event\.key === "ArrowRight"/);
  assert.match(picker, /role="listbox"/);
});
