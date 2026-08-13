import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { eyeMomentum, feedScore, isRolePhaseActive, recommendationSignalWeight, scoreRoleMatch } from "../lib/recommendations/scoring.ts";

const role = { title: "Software engineer", professions: ["Software engineer"], requiredSkills: ["React"], usefulSkills: ["TypeScript"], criticality: "important", workMode: "remote" };
const project = { industry: "Technology", workMode: "remote", city: "London", country: "United Kingdom", timezone: "Europe/London", allowRemoteFallback: true };
const member = { profession: "Software engineer", primarySkill: "React", secondarySkill: "Product design", tertiarySkill: "Community building", industry: "Technology", interests: ["Startups"], city: "London", country: "United Kingdom", timezone: "Europe/London", availability: "open", currentProjectLoad: 0, careerTitles: ["Software engineer"] };

test("ranked skills preserve primary, secondary and tertiary importance", () => {
  const primary = scoreRoleMatch({ member, role, project });
  const secondary = scoreRoleMatch({ member: { ...member, primarySkill: "Writing", secondarySkill: "React" }, role, project });
  const tertiary = scoreRoleMatch({ member: { ...member, primarySkill: "Writing", secondarySkill: "Research", tertiarySkill: "React" }, role, project });
  assert.ok(primary.score > secondary.score);
  assert.ok(secondary.score > tertiary.score);
});

test("local hybrid candidates rank above remote fallback candidates", () => {
  const hybridRole = { ...role, workMode: "hybrid" };
  const london = scoreRoleMatch({ member, role: hybridRole, project: { ...project, workMode: "hybrid" } });
  const manchester = scoreRoleMatch({ member: { ...member, city: "Manchester" }, role: hybridRole, project: { ...project, workMode: "hybrid" } });
  assert.ok(london.eligible);
  assert.ok(manchester.eligible);
  assert.ok(london.score > manchester.score);
});

test("in-person roles reject non-local candidates", () => {
  const result = scoreRoleMatch({ member: { ...member, city: "Manchester", workMode: "remote" }, role: { ...role, workMode: "in_person" }, project: { ...project, workMode: "in_person", allowRemoteFallback: false } });
  assert.equal(result.eligible, false);
});

test("semantic similarity cannot rescue a missing critical skill", () => {
  const result = scoreRoleMatch({ member: { ...member, primarySkill: "Writing", secondarySkill: "Research", tertiarySkill: "Facilitation" }, role: { ...role, criticality: "critical" }, project, semanticSimilarity: .99 });
  assert.ok(result.score <= 59);
});

test("role phases activate in order", () => {
  const roles = [{ phase: "now", capacity: 2, filled: 0, criticality: "critical" }, { phase: "next", capacity: 1, filled: 0 }, { phase: "later", capacity: 1, filled: 0 }];
  assert.equal(isRolePhaseActive("now", "idea", roles), true);
  assert.equal(isRolePhaseActive("next", "idea", roles), false);
  assert.equal(isRolePhaseActive("next", "planning", roles), true);
  assert.equal(isRolePhaseActive("later", "building", roles), false);
  assert.equal(isRolePhaseActive("later", "building", [{ ...roles[0], filled: 2 }, ...roles.slice(1)]), true);
});

test("eyes decay and hit recent and lifetime caps", () => {
  const now = new Date("2026-08-13T12:00:00Z");
  const recent = Array.from({ length: 100 }, () => ({ createdAt: new Date("2026-08-13T11:00:00Z"), now }));
  const score = eyeMomentum(recent);
  assert.equal(score.recent, 6);
  assert.equal(score.lifetime, 4);
  assert.equal(score.score, 10);
  assert.equal(eyeMomentum([{ createdAt: new Date("2026-08-01T00:00:00Z"), now }]).recent, 0);
});

test("popular irrelevant work cannot outrank a strong professional match", () => {
  const strong = feedScore({ roleScore: 90, criticality: "important", filled: 0, capacity: 1, interestRelevance: 1, eyeScore: 0, ageHours: 48, warmPath: false, exploration: false });
  const popularWeak = feedScore({ roleScore: 45, criticality: "important", filled: 0, capacity: 1, interestRelevance: .2, eyeScore: 10, ageHours: 1, warmPath: false, exploration: false });
  assert.ok(strong > popularWeak);
});

test("learning signals value project outcomes above clicks", () => {
  assert.equal(recommendationSignalWeight("eye"), 1);
  assert.equal(recommendationSignalWeight("application"), 4);
  assert.equal(recommendationSignalWeight("completed"), 8);
  assert.equal(recommendationSignalWeight("not_relevant"), -4);
  assert.equal(recommendationSignalWeight("not_now"), 0);
});

test("provider input is privacy-filtered and matching stays deterministic", async () => {
  const [service, provider, feedback, eyes, migration] = await Promise.all([
    readFile(new URL("../lib/recommendations/service.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/recommendations/providers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/matches/feedback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/projects/[projectId]/eyes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_dear_gargoyle.sql", import.meta.url), "utf8"),
  ]);
  assert.match(service, /buildBlueprintInput/);
  assert.doesNotMatch(provider, /owner\.name|owner\.email|dateOfBirth|profile photo|member directory/i);
  assert.match(feedback, /recommendationId/);
  assert.doesNotMatch(feedback, /features:z\./);
  assert.match(eyes, /owners cannot place eyes/i);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS vector/);
  assert.match(migration, /rollout_stage/);
});
