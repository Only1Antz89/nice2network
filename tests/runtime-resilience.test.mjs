import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("project discovery never sends an empty session id to UUID queries", () => {
  const route = read("app/api/projects/route.ts");
  assert.match(route, /viewerId=member\?\.id \|\| null/);
  assert.match(route, /memberId=viewerId\?\?/);
  assert.doesNotMatch(route, /member\?\.id\?\?/);
});

test("optional accessibility and link previews fail without browser errors", () => {
  const accessibility = read("app/api/accessibility/route.ts");
  const preview = read("app/api/link-preview/route.ts");
  assert.match(accessibility, /current\.code === "42P01"/);
  assert.match(accessibility, /DEFAULT_ACCESSIBILITY_PREFERENCES/);
  assert.match(preview, /status: 204/);
  assert.match(preview, /private, max-age=3600/);
  assert.match(preview, /private, no-store/);
});

test("link previews support the Node 22 all-address DNS callback", () => {
  const remoteHttp = read("lib/safe-remote-http.ts");
  assert.match(remoteHttp, /typeof lookupOptions === "object" && lookupOptions\.all/);
  assert.match(remoteHttp, /callback\(null, \[address\]\)/);
});

test("accessibility media updates only inspect newly-added subtrees", () => {
  const controller = read("components/accessibility-controller.tsx");
  const preferences = read("lib/accessibility-preferences.ts");
  assert.match(controller, /record\.addedNodes/);
  assert.match(controller, /applyAccessibilityPreferencesToMedia\(node\)/);
  assert.match(preferences, /root: ParentNode = document/);
});

test("conversation meet action stays compact and highlights on hover", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");
  assert.match(page, /className="icon-button border conversation-meet-button"/);
  assert.match(page, /aria-label=\{selected\.members\.length > 2 \? "Start meet" : "Start video call"\}/);
  assert.doesNotMatch(page, />\{selected\.members\.length > 2 \? "Start meet" : "Video call"\}/);
  assert.match(styles, /conversation-head>\.icon-button:hover/);
  assert.match(styles, /background:var\(--orange\)/);
});

test("a nudge can be sent without message text or an attachment", () => {
  const route = read("app/api/conversations/[conversationId]/messages/route.ts");
  assert.match(route, /v\.type==="nudge"\|\|v\.body\|\|v\.attachmentUrl/);
  assert.match(route, /input\.type==="nudge"\?"👋 Nudge/);
});

test("in-person meets provide a private, opt-in map and ETA flow", () => {
  const page = read("app/page.tsx");
  const route = read("app/api/maps/route/route.ts");
  const config = read("next.config.ts");
  assert.match(page, /function InPersonMeetMap/);
  assert.match(page, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(page, /Your current coordinates are used for this route only and are not saved/);
  assert.match(page, /detail\.provider === "in_person" && detail\.location/);
  assert.match(route, /requireMember\(\)/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /venueCache/);
  assert.match(route, /cache-control": "private, no-store/);
  assert.match(config, /geolocation=\(self\)/);
  assert.match(config, /https:\/\/www\.openstreetmap\.org/);
});

test("dark mode separates text, surface and solid-action colours", () => {
  const styles = read("app/globals.css");
  assert.match(styles, /--surface:#1d1d1b/);
  assert.match(styles, /--solid:#f4f4ef/);
  assert.match(styles, /--solid-ink:#151514/);
  assert.match(styles, /\.settings-section-title,.accessibility-note/);
  assert.match(styles, /\.pulse-card\{background:#10100f;color:#fff/);
  assert.match(styles, /\.sidebar nav button:hover,.sidebar nav button.active/);
  assert.match(styles, /html\[data-colour-theme="dark"\]\[data-contrast="high"\]/);
});

test("profile navigation uses member identity without a profile banner", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");
  const publicStyles = read("app/public.css");
  assert.match(page, /\{ id: "feed" as View, label: "Home", icon: Home \},\s+\{ id: "profile" as View, label: "Profile", icon: UserRound \},\s+\{ id: "projects"/);
  assert.match(page, /isProfile && authenticated\s+\? <Avatar person=\{currentMember\} size="sm"/);
  assert.doesNotMatch(page, /className="profile-cover"/);
  assert.doesNotMatch(page, /className="banner-upload"/);
  assert.match(page, /className="admin-nav-link admin-profile-slot"/);
  assert.match(page, /className="sidebar-account-divider"/);
  assert.match(page, /className="rail-help-link"/);
  assert.match(styles, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(publicStyles, /\.rail-help-link/);
});
