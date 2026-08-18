import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("defines durable product records and safety controls", async () => {
  const schema = await read("db/schema.ts");
  for (const table of ["users", "projects", "projectRoles", "applications", "invitations", "milestones", "projectUpdates", "integrationAccounts", "meetings", "reports", "blocks", "privacySettings", "matchFeedback", "auditLog"]) {
    assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  }
});

test("ships secured feature routes", async () => {
  const [projects, calendar, reports, feedback] = await Promise.all([
    read("app/api/projects/route.ts"),
    read("app/api/calendar/events/route.ts"),
    read("app/api/moderation/reports/route.ts"),
    read("app/api/matches/feedback/route.ts"),
  ]);
  for (const route of [projects, calendar, reports, feedback]) assert.match(route, /requireMember\(\)/);
  assert.match(calendar, /MEETING_CAPACITY/);
  assert.match(calendar, /meetingParticipants/);
});

test("includes a deployable PostgreSQL migration", async () => {
  const migration = await read("drizzle/0000_late_major_mapleleaf.sql");
  assert.match(migration, /CREATE TABLE "users"/);
  assert.match(migration, /CREATE TABLE "match_feedback"/);
  assert.match(migration, /CREATE TABLE "reports"/);
});

test("requires verified email before professional onboarding", async () => {
  const [register, verify, onboarding, credentials] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("app/api/auth/verify/route.ts"),
    read("app/api/auth/onboarding/route.ts"),
    read("auth.ts"),
  ]);
  assert.match(register, /pending_verification/);
  assert.match(register, /sendVerificationEmail/);
  assert.match(verify, /emailVerified/);
  assert.match(verify, /n2_onboarding/);
  assert.match(onboarding, /onboardingCompletedAt/);
  assert.match(credentials, /member\.status !== "active"/);
});

test("onboarding bio communicates and enforces the server character limits", async () => {
  const onboarding = await read("app/onboarding/page.tsx");
  assert.match(onboarding, /minLength=\{ONBOARDING_BIO_MIN_LENGTH\}/);
  assert.match(onboarding, /maxLength=\{600\}/);
  assert.match(onboarding, /At least 6 words/);
  assert.match(onboarding, /Short bio must be at least/);
  assert.match(onboarding, /Short bio must be 600 characters or fewer/);
  assert.match(onboarding, /Suggested roles/);
  assert.match(onboarding, /Suggested industries/);
  assert.match(onboarding, /Suggestions for/);
  assert.match(onboarding, /Suggested interests/);
  assert.match(onboarding, />Username</);
  assert.match(onboarding, /Checking username…/);
  assert.match(onboarding, /profile address will be/);
  assert.match(onboarding, /We could not reach n2/);
  const route = await read("app/api/auth/onboarding/route.ts");
  assert.match(route, /parsed\.error\.issues\[0\]/);
  assert.match(route, /superRefine/);
  assert.match(route, /export async function GET/);
  assert.match(route, /isAvailableUsernameFormat/);
  assert.match(route, /That username is already taken/);
  assert.match(route, /set\(\{ username: input\.username/);
});

test("project creation explains its summary limit and returns field-specific validation", async () => {
  const [page, styles, drafts, projects, projectEdit] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/api/projects/drafts/route.ts"),
    read("app/api/projects/route.ts"),
    read("app/api/projects/[projectId]/route.ts"),
  ]);
  assert.match(page, /Project summary/);
  assert.match(page, /maxLength=\{500\}/);
  assert.match(page, /summaryLength > 500/);
  assert.match(page, /character-fill/);
  assert.match(page, /\/500/);
  assert.match(styles, /conic-gradient\(var\(--orange\) var\(--character-fill\)/);
  assert.match(page, /role="alert" aria-live="polite"/);
  assert.match(drafts, /Project summary must be 500 characters or fewer/);
  assert.match(drafts, /field: String\(issue\.path\[0\]/);
  assert.match(projects, /summary: z\.string\(\)\.trim\(\)\.min\(10\)\.max\(500\)/);
  assert.match(projectEdit, /summary: z\.string\(\)\.trim\(\)\.min\(10\)\.max\(500\)/);
});

test("supports authenticated password changes and private reset links", async () => {
  const [change, forgot, reset] = await Promise.all([
    read("app/api/auth/password/change/route.ts"),
    read("app/api/auth/password/forgot/route.ts"),
    read("app/api/auth/password/reset/route.ts"),
  ]);
  assert.match(change, /requireMember\(\)/);
  assert.match(change, /compare\(input\.currentPassword/);
  assert.match(forgot, /If that account exists/);
  assert.match(forgot, /30 \* 60 \* 1000/);
  assert.match(reset, /verificationTokens\.expires/);
  assert.match(reset, /delete\(sessions\)/);
});

test("protects administrator access and the public n2 identity", async () => {
  const [permissions, auth, adminPage, migration, profile] = await Promise.all([
    read("lib/admin.ts"), read("auth.ts"), read("app/admin/page.tsx"),
    read("drizzle/0002_pink_earthquake.sql"), read("app/page.tsx"),
  ]);
  assert.match(permissions, /requirePermission/);
  assert.match(permissions, /recentlyVerified/);
  assert.match(auth, /isN2Admin/);
  assert.match(adminPage, /recentlyVerified/);
  assert.match(migration, /audit_log_immutable/);
  assert.match(profile, /N2AdminBadge/);
  assert.match(profile, /nice-2-network-mark\.svg/);
});

test("enrols administrators with a private standards-based authenticator QR code", async () => {
  const [access, route, packageJson] = await Promise.all([
    read("app/admin/access/admin-access.tsx"),
    read("app/api/admin/access/route.ts"),
    read("package.json"),
  ]);
  assert.match(access, /QRCodeSVG/);
  assert.match(access, /Reveal setup key/);
  assert.match(access, /navigator\.clipboard\.writeText\(secret\)/);
  assert.match(access, /Google Authenticator, Microsoft Authenticator/);
  assert.match(route, /otpauth:\/\/totp/);
  assert.match(route, /digits=6&period=30/);
  assert.match(packageJson, /qrcode\.react/);
});

test("admin analytics and activity tolerate production data shapes", async () => {
  const [activity, analytics, projects] = await Promise.all([
    read("app/api/admin/activity/route.ts"),
    read("app/api/admin/analytics/route.ts"),
    read("app/api/projects/route.ts"),
  ]);
  assert.match(activity, /jsonb_typeof/);
  assert.match(analytics, /projects\.id}::text/);
  assert.match(projects, /sql\.join\(projectIds/);
  assert.doesNotMatch(projects, /any\(\$\{projectIds\}::uuid\[\]\)/);
});

test("admin actions use branded dialogs and explain protected member conflicts", async () => {
  const [consoleUi, memberList, memberAction] = await Promise.all([
    read("app/admin/admin-console.tsx"),
    read("app/api/admin/members/route.ts"),
    read("app/api/admin/members/[userId]/action/route.ts"),
  ]);
  assert.doesNotMatch(consoleUi, /window\.prompt|window\.confirm/);
  assert.match(consoleUi, /AdminActionDialog/);
  assert.match(consoleUi, /admin-dialog-error/);
  assert.match(memberList, /emailVerified/);
  assert.match(memberAction, /Use password recovery for sign-in problems/);
  assert.match(memberAction, /Activate another super administrator first/);
  assert.match(memberAction, /set_temporary_password/);
  assert.match(memberAction, /forcePasswordChange: true/);
  assert.match(memberAction, /delete\(sessions\)/);
  assert.match(consoleUi, /Set temporary password/);
  assert.match(consoleUi, /Confirm temporary password/);
  assert.match(memberList, /onboardingCompletedAt/);
});

test("enforces protected teen contact and privacy-aware matching", async () => {
  const [registration, conversation, invitations, meetings, matching] = await Promise.all([
    read("app/api/auth/register/route.ts"), read("app/api/conversations/route.ts"),
    read("app/api/projects/[projectId]/invitations/route.ts"), read("app/api/calendar/events/route.ts"),
    read("app/api/matches/score/route.ts"),
  ]);
  assert.match(registration, /teen_16_17/);
  assert.match(conversation, /adult_teen_contact_blocked/);
  assert.match(invitations, /adult_teen_invitation_blocked/);
  assert.match(meetings, /group.*at least three/i);
  assert.match(matching, /projectRecommendations/);
  assert.doesNotMatch(matching, /feedbackAffinity|distanceKm|memberSkills/);
});

test("limits raw analytics retention and excludes direct identifiers", async () => {
  const [analytics, cron] = await Promise.all([read("lib/analytics.ts"), read("app/api/cron/analytics/route.ts")]);
  assert.doesNotMatch(analytics, /messageBody|dateOfBirth|verificationToken|resetToken/);
  assert.match(analytics, /actorHash/);
  assert.match(cron, /- 90/);
  assert.match(cron, /delete\(productEvents\)/);
});

test("ships durable notifications, search, projects and sharing", async () => {
  const [schema, notifications, search, projects, eyes, page, shareSheet, browserNotifications] = await Promise.all([
    read("db/schema.ts"), read("app/api/notifications/route.ts"), read("app/api/search/route.ts"),
    read("app/api/projects/route.ts"), read("app/api/projects/[projectId]/eyes/route.ts"), read("app/page.tsx"),
    read("components/share-sheet.tsx"), read("lib/browser-notifications.ts"),
  ]);
  for (const table of ["notifications", "notificationPreferences", "projectEyes"]) assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  assert.match(notifications, /read_all/);
  assert.match(notifications, /preferences/);
  assert.match(search, /privacySettings/);
  assert.match(search, /projectRoles/);
  assert.match(projects, /scope === "mine"/);
  assert.match(eyes, /project_eye_added/);
  assert.match(page, /ShareSheet/);
  assert.match(page, /function NotificationUnreadIndicator/);
  assert.match(page, /unreadNotifications > 0\s*\? <NotificationUnreadIndicator/);
  assert.match(page, /className="notification-count-bell"/);
  assert.match(page, /Browser notifications/);
  assert.match(page, /Notification sound/);
  assert.match(page, /Notification\.requestPermission\(\)/);
  assert.match(page, /getBrowserNotificationPreferences\(\)/);
  assert.match(page, /playBrowserNotificationSound\(\)/);
  assert.match(browserNotifications, /new AudioContext\(\)/);
  assert.match(browserNotifications, /n2:browser-notifications-changed/);
  assert.match(shareSheet, /WhatsApp/);
  assert.match(shareSheet, /LinkedIn/);
});

test("ships durable project-team recommendations and owner approval", async () => {
  const [schema, draft, blueprint, approve, shortlist, feed, admin] = await Promise.all([
    read("db/schema.ts"), read("app/api/projects/drafts/route.ts"), read("app/api/projects/[projectId]/blueprint/route.ts"),
    read("app/api/projects/[projectId]/blueprint/[blueprintId]/approve/route.ts"), read("app/api/projects/[projectId]/shortlist/route.ts"),
    read("app/api/projects/route.ts"), read("app/api/admin/recommendations/settings/route.ts"),
  ]);
  for (const table of ["algorithmSettings", "projectBlueprints", "memberEmbeddings", "roleEmbeddings", "projectRecommendations", "recommendationEvents", "memberAffinities", "recommendationJobs"]) assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  for (const route of [draft, blueprint, approve, shortlist, feed]) assert.match(route, /requireMember\(\)/);
  assert.match(approve, /blueprintRoleSchema/);
  assert.match(shortlist, /current\.length < 5/);
  assert.match(feed, /rolloutStage >= 2/);
  assert.match(admin, /system\.manage/);
});

test("ships editable profiles, durable chat controls and adaptive n2 meets", async () => {
  const [schema, profile, conversations, chat, message, calendar, signals, room, page] = await Promise.all([
    read("db/schema.ts"), read("app/api/profiles/[userId]/route.ts"), read("app/api/conversations/route.ts"),
    read("app/api/conversations/[conversationId]/messages/route.ts"), read("app/api/messages/[messageId]/route.ts"),
    read("app/api/calendar/events/route.ts"), read("app/api/meetings/[meetingId]/signals/route.ts"),
    read("app/meet/[meetingId]/page.tsx"), read("app/page.tsx"),
  ]);
  for (const field of ["coverImage", "archivedAt", "snoozedUntil", "attachmentUrl", "editedAt"]) assert.match(schema, new RegExp(field));
  assert.match(profile, /careerHistory/);
  assert.match(profile, /educationHistory/);
  for (const action of ["archive", "snooze", "delete"]) assert.match(conversations, new RegExp(action));
  assert.match(chat, /nudge/);
  assert.match(message, /editedAt/);
  assert.match(calendar, /mode: z\.enum\(\["video", "audio", "in_person"\]\)/);
  assert.match(signals, /meeting\.maxParticipants/);
  assert.match(room, /RTCPeerConnection/);
  assert.match(room, /quality-marker/);
  assert.match(room, /Audio & video settings/);
  assert.match(page, /Create group chat/);
});

test("explains message eligibility before conversation creation", async () => {
  const [search, conversations, page] = await Promise.all([
    read("app/api/search/route.ts"),
    read("app/api/conversations/route.ts"),
    read("app/page.tsx"),
  ]);
  assert.match(search, /canMessage/);
  assert.match(search, /Waiting for follow-back/);
  assert.match(search, /sharesProject/);
  assert.match(conversations, /Follow each other or join a shared project/);
  assert.match(page, /person\.canMessage\s*!==\s*false/);
  assert.match(page, /conversationError/);
});

test("keeps the server and browser timeline heading deterministic", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /new Intl\.DateTimeFormat\("en-GB"/);
  assert.match(page, /timeZone: "Europe\/London"/);
  assert.doesNotMatch(page, /new Date\(\)\.toLocaleDateString\(undefined/);
});

test("makes post and project three-dot menus functional", async () => {
  const [page, posts, saved, reports, moderationTargets] = await Promise.all([
    read("app/page.tsx"), read("app/api/posts/[postId]/route.ts"),
    read("app/api/saved-items/route.ts"), read("app/api/moderation/reports/route.ts"),
    read("lib/moderation-targets.ts"),
  ]);
  for (const action of ["Pin", "Bookmark", "Edit post", "Delete post", "Report post"]) assert.match(page, new RegExp(action));
  assert.match(page, /FallbackProjectMenu/);
  assert.match(posts, /Only the post owner can change this post/);
  assert.match(saved, /"post"/);
  assert.match(reports, /moderationTargetTypes/);
  assert.match(moderationTargets, /"post"/);
});

test("edits and deletes posts inside branded, dismissible interfaces", async () => {
  const [page, posts, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/posts/[postId]/route.ts"),
    read("app/globals.css"),
  ]);
  assert.doesNotMatch(page, /window\.prompt\("Edit post"/);
  assert.match(page, /initialPost=\{post\}/);
  assert.match(page, /document\.addEventListener\("pointerdown", dismiss\)/);
  assert.match(page, /Remove this post\?/);
  assert.match(styles, /project-menu button\.danger/);
  assert.match(posts, /linkedProjectIds/);
  assert.match(posts, /attachmentUrl/);
});

test("uses stored project creation time instead of a live-project placeholder", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /relativeNetworkAge\(project\.createdAt\)/);
  assert.doesNotMatch(page, /owner\.role\} · \{second \? "3h" : "18m"\}/);
});

test("uses the n2 share box for internal and external destinations", async () => {
  const shareSheet = await read("components/share-sheet.tsx");
  for (const option of ["Send in messages", "Share to a project", "Copy link", "External sharing options"]) assert.match(shareSheet, new RegExp(option));
  assert.match(shareSheet, /api\/conversations\/\$\{conversation\.id\}\/messages/);
  assert.match(shareSheet, /api\/projects\/\$\{project\.id\}\/updates/);
});

test("ships durable post threads, likes, reposts and purgeable demo activity", async () => {
  const [schema, thread, reactions, page, demo] = await Promise.all([
    read("db/schema.ts"), read("app/api/posts/[postId]/thread/route.ts"),
    read("app/api/posts/[postId]/reactions/route.ts"), read("app/page.tsx"), read("scripts/demo-content.mjs"),
  ]);
  for (const table of ["postReplies", "postLikes", "postReposts"]) assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  assert.match(thread, /requireMember\(\)/);
  assert.match(thread, /timeline_post_reply/);
  assert.match(reactions, /z\.enum\(\["like","repost"\]\)/);
  assert.match(page, /function PostThread/);
  for (const action of ["Reply", "Like", "Repost"]) assert.match(page, new RegExp(action));
  assert.match(demo, /is_demo,created_at\) values/);
  assert.match(demo, /,'visible',true,/);
  assert.match(demo, /delete from post_replies where is_demo = true/);
  assert.match(demo, /share_network_connections=true/);
  assert.match(demo, /show_followers=true/);
  assert.match(demo, /show_following=true/);
  assert.match(demo, /const demoFollows/);
  assert.match(demo, /insert into follows \(follower_id,following_id,created_at\)/);
  assert.match(demo, /delete from network_map_hides where viewer_id/);
});

test("shares clean public URLs with rich social preview metadata", async () => {
  const [shareSheet, sharedPage, image, content] = await Promise.all([
    read("components/share-sheet.tsx"), read("app/share/[kind]/[id]/page.tsx"),
    read("app/share/[kind]/[id]/opengraph-image.tsx"), read("lib/shared-content.ts"),
  ]);
  assert.match(shareSheet, /\/share\/\$\{kind\}\/\$\{item\.id\}/);
  assert.match(shareSheet, /wa\.me\/\?text=\$\{encoded\}/);
  assert.doesNotMatch(shareSheet, /wa\.me\/\?text=\$\{text\}/);
  for (const platform of ["LinkedIn", "Facebook", "Telegram"]) assert.match(shareSheet, new RegExp(platform));
  assert.match(sharedPage, /openGraph/);
  assert.match(sharedPage, /summary_large_image/);
  assert.match(image, /ImageResponse/);
  assert.match(image, /content\.image/);
  assert.match(content, /timelinePosts\.visibility,"network"/);
});

test("ships durable project-first people discovery and mutual following", async () => {
  const [schema,engine,suggestions,follow,feedback,conversations,page,migration]=await Promise.all([
    read("db/schema.ts"),read("lib/people-recommendations.ts"),read("app/api/people/suggestions/route.ts"),read("app/api/users/[userId]/follow/route.ts"),read("app/api/people/suggestions/feedback/route.ts"),read("app/api/conversations/route.ts"),read("app/page.tsx"),read("drizzle/0014_unusual_old_lace.sql"),
  ]);
  for(const table of ["follows","memberRecommendations","memberRecommendationFeedback"])assert.match(schema,new RegExp(`export const ${table} = pgTable`));
  for(const component of ["projectFit","professional","relationship","relevance","location","availability"])assert.match(engine,new RegExp(component));
  assert.match(engine,/teen_16_17/);assert.match(engine,/profileVisibility/);assert.match(engine,/sanctions/);assert.match(engine,/blocks/);
  assert.match(suggestions,/recommendPeople/);assert.match(follow,/mutual/);assert.match(follow,/60/);assert.match(feedback,/not_relevant/);
  assert.match(conversations,/Follow each other or join a shared project/);assert.match(page,/PeopleDiscoveryPanel/);assert.match(page,/api\/people\/suggestions\?limit=3/);
  assert.match(migration,/CREATE TABLE "follows"/);assert.match(migration,/member_recommendations_feed_idx/);
});

test("opens profiles from follower and following account rows", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /href=\{`\/\?profile=\$\{encodeURIComponent\(item\.id\)\}`\}/);
  assert.match(page, /aria-label=\{`Open \$\{item\.name \?\? "n2 member"\}'s profile`\}/);
  assert.match(page, /profileId = params\.get\("profile"\)/);
  assert.match(page, /setSelectedProfileId\(profileId\)/);
  assert.match(page, /setView\("profile"\)/);
});

test("ships a connected-member network map with profession and skill discovery", async () => {
  const [page, graph, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/network/graph/route.ts"),
    read("app/network.css"),
  ]);
  assert.match(page, /label: "Networks"/);
  assert.match(page, /function NetworkView/);
  assert.match(page, /function NetworkGraphIcon/);
  assert.match(page, /view\s*!==\s*"network"\s*&&/);
  assert.match(page, /network-floating-tools/);
  assert.match(page, /All professions/);
  assert.match(page, /View full profile/);
  assert.match(page, /profile\?\.isMutual\s*\?\s*"Connected"/);
  assert.match(graph, /from users u/);
  assert.match(graph, /as is_following/);
  assert.match(graph, /as follows_viewer/);
  assert.match(graph, /or exists\(select 1 from follows incoming/);
  assert.match(page, /edge\.mutual \? "mutual" : "following"/);
  assert.match(page, /n2:network-changed/);
  assert.match(graph, /show_followers,true/);
  assert.match(styles, /\.network-canvas/);
  assert.match(styles, /\.network-node \.avatar/);
  assert.match(styles, /\.app-shell\.network-shell/);
});

test("bounds, explains and safely introduces through the scalable network map", async () => {
  const [schema, graph, introductions, response, hides, explain, page, styles, onboarding, migration] = await Promise.all([
    read("db/schema.ts"), read("app/api/network/graph/route.ts"), read("app/api/network/introductions/route.ts"), read("app/api/network/introductions/[id]/route.ts"), read("app/api/network/hides/route.ts"), read("app/api/network/explain/route.ts"), read("app/page.tsx"), read("app/network.css"), read("app/onboarding/page.tsx"), read("drizzle/0023_common_jetstream.sql"),
  ]);
  for (const table of ["networkMapHides", "introductionRequests"]) assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  assert.match(graph, /MAX_PEOPLE = 52/); assert.match(graph, /MAX_EDGES = 240/); assert.match(graph, /PAGE_SIZE = 5/); assert.match(graph, /kind: "cluster"/); assert.match(graph, /relevance desc/);
  assert.match(graph, /MAX_CONTEXT_PEOPLE = 5/); assert.match(graph, /connected_to_focus/); assert.match(graph, /focus_mutual/); assert.match(graph, /edges\.push\(\.\.\.people\.filter/);
  assert.doesNotMatch(graph, /and not exists\(select 1 from follows mine where \(mine\.follower_id/);
  assert.doesNotMatch(graph, /popularity|order by\s+followers_count/i);
  assert.match(graph, /focus_follows/); assert.match(graph, /follows_focus/); assert.match(graph, /viewerSafetyBand/);
  assert.match(introductions, /\.min\(20\)\.max\(500\)/); assert.match(introductions, /value >= 10/); assert.match(introductions, /14 \* 86_400_000/);
  assert.match(response, /db\.transaction/); assert.match(response, /conversationMembers/); assert.match(response, /status: "accepted"/);
  assert.match(hides, /networkMapHides/); assert.match(explain, /via_valid/); assert.match(migration, /introduction_pending_unique/);
  assert.match(page, /passive: false/); assert.match(page, /onMapPointerMove/); assert.match(page, /sheet-\$\{sheetLevel\}/); assert.match(page, /Default view/);
  assert.match(page, /network-display-menu/); assert.match(page, /Show following/); assert.match(page, /Show followers/);
  assert.match(page, /search-closed/); assert.match(page, /aria-pressed/); assert.match(page, /layoutFocusedNetwork/); assert.match(page, /reservedRects/);
  assert.match(page, /network-node-orbits/);
  assert.doesNotMatch(page, /Hide from map/); assert.match(page, /network-connection-page/); assert.match(page, /connectionPageLoading/);
  assert.match(page, /ResizeObserver/); assert.match(page, /requestAnimationFrame/); assert.match(styles, /density-extreme/);
  assert.match(styles, /network-map-toolbar\.search-closed/); assert.match(styles, /network-menu-deploy/);
  assert.match(styles, /network-back-float[^}]*var\(--surface\)[^}]*color:var\(--ink\)/);
  assert.match(styles, /network-focus-label[^}]*var\(--surface\)[^}]*color:var\(--ink\)/);
  assert.match(styles, /network-brief\.connections-open/); assert.match(styles, /network-connection-page[^}]*overflow:hidden/);
  assert.match(styles, /semantic-far/); assert.match(styles, /touch-action:none/); assert.match(styles, /safe-area-inset-bottom/);
  assert.match(onboarding, /NETWORK VISIBILITY/); assert.match(onboarding, /allowIntroductions:true/);
});

test("connects every open project contribution to a profile-aware application flow", async () => {
  const [page, apply, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/projects/[projectId]/apply/route.ts"),
    read("app/globals.css"),
  ]);
  assert.match(page, /function ContributionDialog/);
  assert.match(page, /n2:apply-role/);
  assert.match(page, /Get involved/);
  assert.match(page, /Your profile may not closely match this contribution/);
  assert.match(page, /Offer another contribution/);
  assert.match(apply, /professionMatch/);
  assert.match(apply, /requiredMatches/);
  assert.match(apply, /You have already applied for this role/);
  assert.match(styles, /\.role-fit\.warning/);
});
test("meet creation selects n2 profiles instead of collecting attendee emails", async () => {
  const [page, endpoint, calendar] = await Promise.all([
    read("app/page.tsx", "utf8"),
    read("app/api/meetings/attendees/route.ts", "utf8"),
    read("app/api/calendar/events/route.ts", "utf8"),
  ]);
  assert.match(page, /MeetAttendeePicker/);
  assert.doesNotMatch(page, /Attendee emails/);
  assert.match(page, /Public profiles/);
  assert.match(endpoint, /Mutual connection/);
  assert.match(endpoint, /Follows you/);
  assert.match(endpoint, /profileVisibility/);
  assert.match(calendar, /attendeeIds/);
  assert.match(calendar, /createNotifications/);
});

test("meet visibility is selected in the form without browser prompts", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /className="meet-visibility-picker"/);
  assert.match(page, /\["public", "Public", "Visible to everyone on n2", Globe2\]/);
  assert.match(page, /\["project", "Project", "Only the selected project", BriefcaseBusiness\]/);
  assert.match(page, /\["private", "Private", "Invited people only", ShieldCheck\]/);
  assert.doesNotMatch(page, /Meet visibility: public, project or private/);
  assert.doesNotMatch(page, /Paste the project ID for this meet/);
  assert.match(styles, /\.meet-visibility-options/);
  assert.match(styles, /meet-visibility-options>button\.active\{[^}]*box-shadow:inset 0 3px #ff6b35/);
  assert.match(styles, /meet-visibility-options>button\.active svg\{color:#ff6b35\}/);
});

test("meet editing keeps the invite step and reloads existing invitees", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /fetch\(`\/api\/meetings\/\$\{meet\.id\}`\)/);
  assert.match(page, /participantProfiles: result\.participants \?\? \[\]/);
  assert.match(page, /if \(meetStep === 1\) \{\s*continueMeetSetup\(\);\s*return;/);
  assert.match(page, /<button type="submit" className="primary-button">\s*\{meetStep === 1 \? <>Continue to invitees/);
  assert.match(styles, /\.podcast-table-surface\{[^}]*aspect-ratio:1/);
  assert.match(styles, /background:radial-gradient\(circle at center/);
});

test("ships a role-aware branded podcast stage with private questions and playable audio", async () => {
  const [schema, room, stageApi, chatApi, signalsApi, calendar, page, styles, migration] = await Promise.all([
    read("db/schema.ts"),
    read("app/meet/[meetingId]/page.tsx"),
    read("app/api/meetings/[meetingId]/podcast/route.ts"),
    read("app/api/meetings/[meetingId]/chat/route.ts"),
    read("app/api/meetings/[meetingId]/signals/route.ts"),
    read("app/api/calendar/events/route.ts"),
    read("app/page.tsx"),
    read("app/globals.css"),
    read("drizzle/0017_tranquil_vector.sql"),
  ]);
  assert.match(schema, /export const meetingMessages = pgTable/);
  assert.match(schema, /speakerStatus: text\("speaker_status"\)/);
  for (const role of ["HOST", "CO-HOST", "GUEST SPEAKER", "AUDIENCE SPEAKER"]) assert.match(room, new RegExp(role));
  for (const action of ["request_speak", "approve", "dismiss", "mute"]) assert.match(stageApi, new RegExp(action));
  assert.match(room, /function useSpeaking/);
  assert.match(room, /function RemoteAudio/);
  assert.match(room, /roomModeRef\.current === "audio"[^\n]+addTransceiver\("audio", \{ direction: "recvonly" \}\)/);
  assert.match(room, /HOST CONSOLE/);
  assert.match(room, /LISTENER VIEW/);
  assert.match(room, /podcast-chat-tabs/);
  assert.match(chatApi, /QUESTION_PREFIX/);
  assert.match(chatApi, /canSeeQuestions/);
  assert.match(signalsApi, /role: meetingParticipants\.role/);
  assert.match(calendar, /attendeeRoles/);
  assert.match(page, /Guest speaker/);
  assert.match(page, /Co-host/);
  assert.match(styles, /@keyframes n2PodcastPulse/);
  assert.match(styles, /\.podcast-card\.speaking/);
  assert.match(migration, /CREATE TABLE "meeting_messages"/);
});

test("keeps project labels neutral and preserves server-owned founder identity", async () => {
  const [brand, profile, styles, darkStyles] = await Promise.all([
    read("components/network-brand.tsx"),
    read("app/api/profiles/[userId]/route.ts"),
    read("app/globals.css"),
    read("app/dark-theme.css"),
  ]);
  assert.match(styles, /--orange:#ff6b35/);
  assert.match(styles, /project-kicker \.project-type-label\{background:none!important;color:var\(--ink\)!important;border:0!important/);
  assert.doesNotMatch(styles, /project-type-label\{background:var\(--orange\)!important/);
  assert.match(darkStyles, /\.project-kicker \.project-type-label,\s*\.project-blue \.project-kicker \.project-type-label \{\s*background: none !important;\s*color: var\(--ink\);\s*border: 0 !important;/);
  assert.doesNotMatch(darkStyles, /\.project-type-label[\s\S]{0,160}background: var\(--accent-soft\)/);
  assert.match(profile, /isFounder: sql<boolean>`\$\{users\.role\} = 'founder'`/);
  assert.match(brand, /function N2FounderLabel/);
  assert.match(brand, /className="n2-founder-label">n2 Founder/);
  assert.match(styles, /\.n2-founder-label\{color:var\(--orange\)/);
});

test("project comments share the keyboard-safe reply composer and preserve emoji categories", async () => {
  const [page, picker, styles] = await Promise.all([
    read("app/page.tsx"),
    read("components/emoji-picker.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /project-comment-composer/);
  assert.match(page, /Write a project comment/);
  assert.match(page, /className="post-reply-send"/);
  assert.match(picker, /SuggestionMode\.RECENT/);
  assert.match(styles, /\.emoji-popover \.epr-category-nav\{display:flex!important;visibility:visible!important/);
  assert.doesNotMatch(styles, /\.comment-composer \.emoji-popover button\{[^}]*background:transparent/);
  assert.match(styles, /\.comment-thread \.project-comment-composer/);
});
