import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PEOPLE_COMPONENT_WEIGHTS,
  WORTH_MEETING_WEIGHTS,
  publicMeetingsAreSimilar,
  scorePeopleSignals,
  scoreWorthMeetingSignals,
} from "../lib/people-recommendation-scoring.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("people recommendation components use the approved 100-point model", () => {
  assert.deepEqual(PEOPLE_COMPONENT_WEIGHTS, { skills: 25, projectFit: 25, postAffinity: 15, projectWatch: 15, meetAffinity: 15, context: 5 });
  const perfect = scorePeopleSignals({
    skillStrength: 1,
    projectFitStrength: 1,
    directPostLikes: 2,
    sharedPostLikes: 0,
    watchesViewerProject: true,
    viewerWatchesCandidateProject: true,
    samePublicMeet: true,
    similarPublicMeet: false,
    contextStrength: 1,
  });
  assert.equal(perfect.score, 100);
  assert.deepEqual(perfect.components, PEOPLE_COMPONENT_WEIGHTS);
});

test("post likes, project watches and similar meets contribute independently", () => {
  const base = { skillStrength: 0, projectFitStrength: 0, directPostLikes: 0, sharedPostLikes: 0, watchesViewerProject: false, viewerWatchesCandidateProject: false, samePublicMeet: false, similarPublicMeet: false, contextStrength: 0 };
  assert.ok(scorePeopleSignals({ ...base, directPostLikes: 1 }).components.postAffinity > 0);
  assert.ok(scorePeopleSignals({ ...base, sharedPostLikes: 1 }).components.postAffinity > 0);
  assert.ok(scorePeopleSignals({ ...base, watchesViewerProject: true }).components.projectWatch > 0);
  assert.ok(scorePeopleSignals({ ...base, viewerWatchesCandidateProject: true }).components.projectWatch > 0);
  assert.ok(scorePeopleSignals({ ...base, similarPublicMeet: true }).components.meetAffinity > 0);
});

test("worth meeting requires two categories and the approved threshold", () => {
  assert.deepEqual(WORTH_MEETING_WEIGHTS, { sharedInterests: 40, progression: 35, location: 25 });
  assert.equal(scoreWorthMeetingSignals({ sharedInterestCount: 2, careerStrength: 0, projectStageStrength: 0, sameCity: false, sameCountry: false, candidateLocationVisible: true }).eligible, false);
  assert.equal(scoreWorthMeetingSignals({ sharedInterestCount: 1, careerStrength: 1, projectStageStrength: 1, sameCity: false, sameCountry: false, candidateLocationVisible: true }).eligible, true);
  assert.equal(scoreWorthMeetingSignals({ sharedInterestCount: 2, careerStrength: 0, projectStageStrength: 0, sameCity: true, sameCountry: true, candidateLocationVisible: false }).eligible, false);
});

test("public meets match by linked industry or two meaningful topic terms", () => {
  assert.equal(publicMeetingsAreSimilar({ industry: "Climate", title: "One" }, { industry: "Climate", title: "Two" }), true);
  assert.equal(publicMeetingsAreSimilar({ title: "Circular fashion founders" }, { title: "Circular fashion workshop" }), true);
  assert.equal(publicMeetingsAreSimilar({ title: "Climate finance" }, { title: "Community cooking" }), false);
});

test("recommendation collection enforces privacy and all requested signals", async () => {
  const [service, route, page] = await Promise.all([
    read("lib/people-recommendations.ts"),
    read("app/api/people/worth-meeting/route.ts"),
    read("app/page.tsx"),
  ]);
  assert.match(service, /profileVisibility, "public"/);
  assert.match(service, /useActivityForMatching !== false/);
  assert.match(service, /candidateLikes\.filter/);
  assert.match(service, /viewerLiked\.has/);
  assert.match(service, /watchesViewerProject/);
  assert.match(service, /viewerWatchesCandidateProject/);
  assert.match(service, /projectRecommendations\.status, "active"/);
  assert.match(service, /meetings\.visibility, "public"/);
  assert.match(service, /meetings\.mode, "in_person"/);
  assert.match(service, /lt\(meetings\.endsAt, new Date\(\)\)/);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.match(page, /filter !== "Following"/);
  assert.match(page, /authenticated && filter === "Following" && worthMeeting/);
  assert.doesNotMatch(page, /onProfile\("demo-lena"\)/);
});
