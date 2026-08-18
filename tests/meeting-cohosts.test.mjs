import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("meet creation advances through invitees to a clear final create action", async () => {
  const [page, theme] = await Promise.all([
    read("app/page.tsx"),
    read("app/dark-theme.css"),
  ]);

  assert.match(page, /if \(meetStep === 1\) \{\s*continueMeetSetup\(\);\s*return;/);
  assert.match(page, /if \(!invitees\.length\) \{\s*setConfirmEmptyMeet\(true\);\s*return;/);
  assert.match(page, />Invitees<\/span>/);
  assert.match(page, /Continue to invitees/);
  assert.match(page, /<button type="submit" className="primary-button">\s*\{meetStep === 1 \? <>Continue to invitees/);
  assert.match(page, /meetFlowBodyRef\.current\?\.scrollTo\(\{ top: 0, behavior: "instant" \}\)/);
  assert.doesNotMatch(page, /type="button" className="primary-button" onClick=\{continueMeetSetup\}>Continue to invitees/);
  assert.match(page, /Create without invitees/);
  assert.match(page, /persistMeet\(meetFormRef\.current\)/);
  assert.match(page, /meet-detail-people/);
  assert.match(page, /meetRoleLabel\(detail\.mode/);
  assert.match(theme, /\.meet-people-tabs > button,/);
  assert.match(theme, /\.meet-people-tabs > button\.active \{\s*background: var\(--solid\) !important;\s*color: var\(--solid-ink\) !important;/);
  assert.match(theme, /\.meet-people-results > button\.selected \{\s*background: var\(--positive-soft\) !important;/);
});

test("all meet types expose role-aware invitations while preserving co-hosts on mode changes", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /type MeetInviteRole = "cohost" \| "speaker" \| "listener"/);
  assert.match(page, /if \(role === "cohost"\) return "Co-host"/);
  assert.match(page, /"Guest speaker"/);
  assert.match(page, /return mode === "in_person" \? "Attendee" : "Participant"/);
  assert.match(page, /meetRole: person\.meetRole === "cohost" \? "cohost" : defaultMeetInviteRole\(value\)/);
  assert.match(page, /cohostCount >= 2/);
});

test("meeting APIs enforce co-host eligibility, limits, authority, and immutable co-host sets", async () => {
  const [authority, calendar, meeting] = await Promise.all([
    read("lib/meetings.ts"),
    read("app/api/calendar/events/route.ts"),
    read("app/api/meetings/[meetingId]/route.ts"),
  ]);

  assert.match(authority, /MAX_MEETING_COHOSTS = 2/);
  assert.match(authority, /Attendee roles must belong to selected attendees/);
  assert.match(authority, /must be a mutual connection/);
  assert.match(authority, /candidate\.status !== "active"/);
  assert.match(authority, /blockedIds\.has\(id\)/);
  assert.match(authority, /restrictedIds\.has\(id\)/);
  assert.match(calendar, /validateMeetingCohostCandidates\(member\.id, cohostIds\)/);
  assert.match(meeting, /requireMeetingManager\(meetingId, member\.id\)/);
  assert.match(meeting, /Only the primary host can appoint or remove co-hosts/);
  assert.match(meeting, /canManage: authority\.canManage, canDelete: authority\.canDelete/);
  assert.match(meeting, /existing\.createdBy !== member\.id/);
});

test("managers can explicitly end a room while every hang-up only leaves", async () => {
  const [signals, room] = await Promise.all([
    read("app/api/meetings/[meetingId]/signals/route.ts"),
    read("app/meet/[meetingId]/page.tsx"),
  ]);

  assert.match(signals, /if \(!authority\.canManage\)/);
  assert.match(room, /async function leave\(\)[\s\S]*?signal\("leave", \{\}\)/);
  assert.match(room, /async function endMeet\(\)[\s\S]*?signal\("end", \{\}\)/);
  assert.match(room, /End meet for everyone/);
  assert.doesNotMatch(room, /isHost\.current \? "end" : "leave"/);
});
