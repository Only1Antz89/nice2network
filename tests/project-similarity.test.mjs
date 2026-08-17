import assert from "node:assert/strict";
import test from "node:test";
import {
  developmentCompatibility,
  employmentOpportunity,
  lexicalProjectSimilarity,
  projectLocationCompatibility,
  scoreProjectSimilarity,
  similarityReasons,
  teamSizeSimilarity,
} from "../lib/recommendations/project-similarity-scoring.ts";

test("strict lexical fallback accepts near duplicates and rejects broad industry overlap", () => {
  const source = { title: "Neighbourhood repair and reuse hub", summary: "Repair household items locally and teach practical reuse skills.", description: "A community workshop for repairs and reuse.", industry: "Community services" };
  assert.ok(lexicalProjectSimilarity(source, { ...source }) >= .82);
  assert.ok(lexicalProjectSimilarity(source, { title: "Community music nights", summary: "Live music for local audiences and performers.", description: "Regular concerts.", industry: "Community services" }) < .82);
});

test("similarity requires extreme purpose alignment, a suitable role, and an overall score of 80", () => {
  const strong = scoreProjectSimilarity({ semantic: .94, employment: .9, location: 1, size: .9, development: 1, roleFitScore: 88 });
  assert.equal(strong.qualifies, true);
  assert.equal(strong.score, 94);
  assert.equal(scoreProjectSimilarity({ semantic: .81, employment: 1, location: 1, size: 1, development: 1, roleFitScore: 100 }).qualifies, false);
  assert.equal(scoreProjectSimilarity({ semantic: 1, employment: 1, location: 1, size: 1, development: 1, roleFitScore: 44 }).qualifies, false);
});

test("location, size, development and employment components reward consolidation fit", () => {
  assert.equal(projectLocationCompatibility({ city: "London", country: "UK", timezone: "Europe/London", workMode: "hybrid" }, { city: "London", country: "UK", timezone: "Europe/London", workMode: "hybrid" }), 1);
  assert.equal(teamSizeSimilarity(6, 6), 1);
  assert.equal(teamSizeSimilarity(3, 6), .5);
  assert.ok(developmentCompatibility("planning", "building", 2, 4) > developmentCompatibility("building", "idea", 0, 4));
  assert.ok(employmentOpportunity(80, 2) > employmentOpportunity(50, 1));
});

test("reasons are deterministic and lead with the strongest evidence", () => {
  const reasons = similarityReasons({ semantic: .95, employment: .82, location: 1, size: .8, development: .9, roleFitScore: 82, roleTitle: "Product designer", openings: 2, locationLabel: "London" });
  assert.equal(reasons.length, 3);
  assert.equal(reasons[0], "The purpose and industry are very closely aligned");
  assert.ok(reasons.some(reason => reason.includes("Product designer")));
});

test("the feature is default-on, admin-controlled, owner-only and pre-publish", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const [schema, settingsRoute, previewRoute, page, migration] = await Promise.all([
    read("db/schema.ts"), read("app/api/admin/recommendations/settings/route.ts"), read("app/api/projects/similarity/preview/route.ts"), read("app/page.tsx"), read("drizzle/0021_white_absorbing_man.sql"),
  ]);
  assert.match(schema, /similarProjectSuggestionsEnabled: boolean\("similar_project_suggestions_enabled"\).*default\(true\)/);
  assert.match(settingsRoute, /requirePermission\("system\.manage"\)/);
  assert.match(settingsRoute, /similarProjectSuggestionsEnabled/);
  assert.match(previewRoute, /requireMember\(\)/);
  assert.match(page, /Similar work is already underway/);
  assert.match(page, /Continue with my project/);
  assert.match(migration, /project_embeddings_cosine_idx/);
});
