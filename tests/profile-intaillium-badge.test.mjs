import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("the n2 IntAillium identity follows the username like the founder identity", () => {
  assert.match(
    page,
    /<div className="profile-role">[\s\S]*?profile\?\.isFounder[\s\S]*?<N2FounderLabel \/>[\s\S]*?profile\?\.isN2Admin[\s\S]*?<N2IntAilliumWordmark \/>/,
  );
});

test("identity and location share the same profile metadata row", () => {
  assert.match(page, /<div className="profile-role">[\s\S]*?<span className="profile-identity">[\s\S]*?<span className="profile-meta-separator"[\s\S]*?<span className="profile-location">/);
});

test("the IntAillium identity does not depend on an empty profession", () => {
  assert.doesNotMatch(page, /person\.role === "n2 member"/);
});
