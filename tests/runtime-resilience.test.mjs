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
  assert.match(route, /input\.type==="nudge"\?"User has been nudged"/);
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

test("the mobile authentication logo keeps inverse contrast in every theme", async () => {
  const styles = await read("app/globals.css");

  assert.match(styles, /\.mobile-auth-logo span\{[^}]*background:var\(--solid\);color:var\(--solid-ink\)/);
  assert.doesNotMatch(styles, /\.mobile-auth-logo span\{[^}]*background:var\(--ink\);color:#fff/);
});

test("mobile navigation omits the current page while full profiles retain banners", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");
  const publicStyles = read("app/public.css");
  assert.match(page, /\{ id: "feed" as View, label: "Home", icon: Home \},\s+\{ id: "profile" as View, label: "Profile", icon: UserRound \},\s+\{ id: "projects"/);
  assert.match(page, /isProfile && authenticated\s+\? <Avatar person=\{currentMember\} size="sm"/);
  assert.match(page, /className="mobile-sidebar-backdrop"[\s\S]*?onClick=\{\(\) => setMenuOpen\(false\)\}/);
  assert.match(page, /aria-label=\{menuOpen \? "Close navigation" : "Open navigation"\}/);
  assert.match(page, /aria-expanded=\{menuOpen\}/);
  assert.match(page, /aria-controls="mobile-sidebar"/);
  assert.match(page, /className="profile-cover"/);
  assert.match(page, /profile\?\.coverImage/);
  assert.match(page, /className="banner-upload"/);
  assert.match(page, /uploadProfileMedia\("banner"/);
  assert.doesNotMatch(page, /className="profile-chip"/);
  assert.match(page, /className="admin-nav-link admin-profile-slot"/);
  assert.match(page, /className="sidebar-account-divider"/);
  assert.match(page, /className="rail-help-link"/);
  assert.match(page, /const mobileNav = nav\.filter\(\(item\) => item\.id !== "profile" && item\.id !== "network"\)/);
  assert.match(page, /mobileNav\.filter\(\(item\) => item\.id !== view\)\.map/);
  assert.match(page, /item\.id === "notifications" && unreadNotifications > 0\s+\? <NotificationUnreadIndicator unread=\{unreadNotifications\}/);
  assert.match(page, /item\.id === "messages" && unreadMessages > 0\s+\? <MessageUnreadIndicator unread=\{unreadMessages\}/);
  assert.match(styles, /grid-auto-columns:minmax\(0,1fr\)/);
  assert.match(styles, /\.mobile-topbar \.logo>span:last-child\{display:inline;white-space:nowrap\}/);
  assert.match(styles, /\.sidebar nav button>\.avatar\{width:24px;height:24px\}/);
  assert.match(styles, /\.mobile-sidebar-backdrop\{display:block;position:fixed;inset:0;z-index:35/);
  assert.match(publicStyles, /\.rail-help-link/);
});

test("the home greeting remains welcoming throughout the day", () => {
  const page = read("app/page.tsx");
  assert.match(page, /if \(hour < 12\) return "Good morning"/);
  assert.match(page, /if \(hour < 18\) return "Good afternoon"/);
  assert.match(page, /return "Good evening"/);
  assert.doesNotMatch(page, /Good night/);
});

test("the app shell remains usable with browser zoom and Windows display scaling", () => {
  const layout = read("app/layout.tsx");
  const styles = read("app/globals.css");
  assert.match(layout, /width: "device-width"/);
  assert.match(layout, /initialScale: 1/);
  assert.match(styles, /html\{overflow-x:hidden;text-size-adjust:100%;-webkit-text-size-adjust:100%\}/);
  assert.match(styles, /\.sidebar,\.right-rail\{\s*overflow-x:hidden;\s*overflow-y:auto;/);
  assert.match(styles, /@media\(min-width:981px\) and \(max-height:680px\)/);
  assert.match(styles, /height:calc\(100dvh - var\(--n2-compact-content-top\) - var\(--n2-compact-content-bottom\)\)/);
  assert.match(styles, /\.conversation-page\{min-height:0\}/);
});

test("notifications use a dedicated responsive page instead of a mobile floating control", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");
  const notificationsPage = read("components/notifications-page.tsx");
  const api = read("app/api/notifications/route.ts");
  const schema = read("db/schema.ts");
  const notificationService = read("lib/notifications.ts");
  const posts = read("app/api/posts/route.ts");
  const projectUpdates = read("app/api/projects/[projectId]/updates/route.ts");
  const migration = read("drizzle/0024_damp_brood.sql");
  assert.doesNotMatch(page, /className="mobile-page-notification/);
  assert.doesNotMatch(styles, /\.mobile-page-notification/);
  assert.match(page, /label: "Notifications", icon: Bell/);
  assert.match(page, /<NotificationsPage onUnreadCounts=\{updateUnreadCounts\}/);
  for (const section of ["LATEST NOTIFICATION", "All", "Projects", "Followers", "Mentions"]) assert.match(notificationsPage, new RegExp(section));
  assert.match(notificationsPage, /role="tablist" aria-label="Notification categories"/);
  assert.match(notificationsPage, /role="tabpanel"/);
  assert.match(notificationsPage, /group\.items\.length > 0 && <b>\{group\.items\.length\}<\/b>/);
  assert.match(notificationsPage, /\{item\.actorName \?\? "nice 2 network"\}/);
  assert.doesNotMatch(notificationsPage, /Clear all/);
  assert.doesNotMatch(notificationsPage, /method: "DELETE"/);
  assert.match(api, /export async function DELETE\(\)/);
  assert.match(api, /db\.delete\(notifications\)\.where\(eq\(notifications\.userId, member\.id\)\)/);
  assert.doesNotMatch(notificationsPage, /group\.items\.slice\(0, 8\)/);
  assert.match(styles, /\.notification-tabs\{display:flex;align-items:flex-end;/);
  assert.match(styles, /\.notifications-page-row\.connection\.unread\{box-shadow:inset 3px 0 var\(--green\)\}/);
  assert.match(notificationsPage, /followedUpdates/);
  assert.match(api, /entityType: notifications\.entityType/);
  assert.match(api, /ilike\(notifications\.title, "%tagged you%"\)/);
  assert.match(schema, /followedUpdates: boolean\("followed_updates"\)/);
  assert.match(notificationService, /if\(item\.type==="following"\)return preference\.followedUpdates/);
  assert.match(posts, /type: "following" as const/);
  assert.match(projectUpdates, /type:"following" as const/);
  assert.match(migration, /ADD COLUMN "followed_updates" boolean DEFAULT true NOT NULL/);
});

test("message alerts deep-link to their conversation and use message-specific unread counters", () => {
  const page = read("app/page.tsx");
  const styles = read("app/globals.css");
  const notificationsApi = read("app/api/notifications/route.ts");
  const conversationsApi = read("app/api/conversations/route.ts");
  const messagesApi = read("app/api/conversations/[conversationId]/messages/route.ts");
  assert.match(messagesApi, /view=messages&conversation=\$\{encodeURIComponent\(conversationId\)\}/);
  assert.match(page, /requestedView === "messages"[\s\S]*setMessageConversationId\(conversationId\)[\s\S]*setView\("messages"\)/);
  assert.match(notificationsApi, /action: z\.literal\("read_conversation"\)/);
  assert.match(notificationsApi, /ne\(notifications\.type, "message"\)/);
  assert.match(notificationsApi, /unreadMessages: unreadMessages\.value/);
  assert.match(read("components/notifications-page.tsx"), /item\.type !== "message" \|\| isMentionNotification\(item\)/);
  assert.match(conversationsApi, /unreadCount:/);
  assert.match(page, /className="message-row-unread-count"/);
  assert.match(styles, /\.message-row-unread-count/);
});

test("dark mode uses one semantic surface system across core product areas", () => {
  const layout = read("app/layout.tsx");
  const theme = read("app/dark-theme.css");
  assert.match(layout, /import "\.\/dark-theme\.css"/);
  for (const selector of [
    ".timeline-post",
    ".official-notice",
    ".project-detail-grid > article",
    ".project-team-grid > button",
    ".project-roadmap article",
    ".comment-thread > header",
    ".meet-detail",
    ".network-canvas",
    ".mobile-nav",
  ]) assert.match(theme, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(theme, /--surface-overlay:/);
  assert.match(theme, /--control-hover:/);
  assert.match(theme, /person-suggest > \.follow-person-button[\s\S]*background: #050505 !important/);
  assert.match(theme, /html\[data-colour-theme="system"\] \.person-suggest/);
});

test("dark conversations, contributor marks and calendar controls retain contrast", () => {
  const theme = read("app/dark-theme.css");
  assert.match(theme, /\.bubble\.mine\s*\{\s*background: var\(--inverse-surface\);\s*color: var\(--inverse-ink\)/);
  assert.match(theme, /\.ai-icon \.n2-ai-mark\.inverse\s*\{\s*background: var\(--inverse-ink\);\s*color: var\(--inverse-surface\)/);
  assert.match(theme, /\.view-toggle button\.active\s*\{\s*background: var\(--solid\) !important;\s*color: var\(--solid-ink\) !important/);
});

test("meet editor uses a focused desktop width and only scrolls as a fallback", () => {
  const styles = read("app/globals.css");
  assert.match(styles, /\.modal-backdrop:has\(\.meet-creation-flow\)\{padding:10px\}/);
  assert.match(styles, /width:min\(920px,calc\(100vw - 20px\)\)/);
  assert.match(styles, /height:min\(940px,calc\(100dvh - 20px\)\)/);
  assert.match(styles, /\.meet-flow-body\{[^}]*overflow-y:auto/);
  assert.match(styles, /grid-template-columns:140px minmax\(0,1fr\)/);
  assert.match(styles, /@media\(max-width:700px\)\{\s*\.modal-backdrop:has\(\.meet-creation-flow\)\{padding:0\}/);
});
