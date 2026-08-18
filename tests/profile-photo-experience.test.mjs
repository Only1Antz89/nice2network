import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const brand = readFileSync(new URL("../components/network-brand.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const mediaRoute = readFileSync(new URL("../app/api/profiles/[userId]/media/route.ts", import.meta.url), "utf8");

test("real profile photos open in an accessible lightbox", () => {
  assert.match(brand, /n2:expand-profile-photo/);
  assert.match(brand, /expandable\?: boolean/);
  assert.match(brand, /const canExpand = expandable && Boolean\(person\.img\)/);
  assert.match(page, /className="profile-photo-lightbox"/);
});

test("network node photos select members while the detail photo remains expandable", () => {
  assert.match(page, /name: currentMember\.name,[\s\S]*?size="lg"[\s\S]*?expandable=\{false\}/);
  assert.match(page, /name: node\.name \?\? "n2 member",[\s\S]*?size="lg"[\s\S]*?expandable=\{false\}/);
  assert.match(page, /className="network-sheet-summary"[\s\S]*?<Avatar[^>]*ring expandable/);
});

test("profile media can be removed independently", () => {
  assert.match(page, /removeProfileMedia\("banner"\)/);
  assert.match(page, /removeProfileMedia\("avatar"\)/);
  assert.match(mediaRoute, /export async function DELETE/);
});

test("avatar changes update the signed-in sidebar photo", () => {
  assert.match(page, /n2:profile-photo-changed/);
  assert.match(page, /img: \(event as CustomEvent<string \| null>\)\.detail/);
  assert.match(page, /fetch\(`\/api\/profiles\/\$\{encodeURIComponent\(memberId\)\}`/);
  assert.match(page, /img: profile\.image \?\? null/);
  assert.match(page, /profile-nav-button/);
  assert.match(styles, /\.sidebar nav button\.profile-nav-button>\.avatar/);
  assert.match(styles, /object-fit:cover/);
});
