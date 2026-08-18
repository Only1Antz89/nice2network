import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingParticipants, meetings, projectMembers, safetyRisks, savedItems, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { MEETING_CAPACITY, meetingCohostIds, validateMeetingCohostCandidates, type MeetingMode } from "@/lib/meetings";
import { createNotifications } from "@/lib/notifications";

const schema = z.object({
  provider: z.enum(["n2", "google", "microsoft", "in_person"]).default("n2"),
  mode: z.enum(["video", "audio", "in_person"]).optional(),
  projectId: z.uuid().optional(),
  visibility: z.enum(["public", "project", "private"]).default("public"),
  title: z.string().min(3).max(160),
  description: z.string().max(3000).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  timezone: z.string().default("Europe/London"),
  location: z.string().max(300).optional(),
  thumbnailUrl: z.union([
    z.string().max(2_100_000).regex(/^data:image\/(?:jpeg|png|webp);base64,/),
    z.null(),
  ]).optional(),
  attendeeIds: z.array(z.uuid()).max(100).default([]),
  attendeeRoles: z.record(z.uuid(), z.enum(["cohost", "speaker", "listener"])).default({}),
  attendees: z.array(z.object({ email: z.email(), name: z.string().max(100).optional() })).max(100).default([]),
  reminderMinutes: z.number().int().min(0).max(10080).default(30),
  online: z.boolean().default(true),
}).superRefine((value, context) => {
  if (new Date(value.endsAt) <= new Date(value.startsAt)) context.addIssue({ code: "custom", message: "End time must follow start time", path: ["endsAt"] });
  if (value.visibility === "project" && !value.projectId) context.addIssue({ code: "custom", message: "Choose a project for a project meet", path: ["projectId"] });
  const mode = value.mode ?? (value.provider === "in_person" ? "in_person" : "video");
  if (mode === "in_person" && !value.location?.trim()) context.addIssue({ code: "custom", message: "Add a location for an in-person meet", path: ["location"] });
});

function modeFor(input: z.infer<typeof schema>): MeetingMode {
  return input.mode ?? (input.provider === "in_person" ? "in_person" : "video");
}

export async function GET() {
  try {
    const member = await requireMember();
    const db = getDb();
    const projectIds = (await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, member.id))).map(row => row.projectId);
    const invited = sql<boolean>`exists (select 1 from ${meetingParticipants} mp where mp.meeting_id = ${meetings.id} and mp.user_id = ${member.id})`;
    const visibility = projectIds.length
      ? or(eq(meetings.createdBy, member.id), eq(meetings.visibility, "public"), invited, and(eq(meetings.visibility, "project"), inArray(meetings.projectId, projectIds)))
      : or(eq(meetings.createdBy, member.id), eq(meetings.visibility, "public"), invited);
    const selection = {
      meeting: meetings,
      isPinned: sql<boolean>`coalesce(${savedItems.pinned},false)`,
      isBookmarked: sql<boolean>`coalesce(${savedItems.bookmarked},false)`,
    } as const;
    const now = new Date();
    const upcomingRows = await db.select(selection).from(meetings)
      .leftJoin(savedItems, and(eq(savedItems.entityType, "meeting"), eq(savedItems.entityId, meetings.id), eq(savedItems.userId, member.id)))
      .where(and(gte(meetings.endsAt, now), visibility))
      .orderBy(meetings.startsAt)
      .limit(100);
    const pastRows = await db.select(selection).from(meetings)
      .leftJoin(savedItems, and(eq(savedItems.entityType, "meeting"), eq(savedItems.entityId, meetings.id), eq(savedItems.userId, member.id)))
      .where(and(lt(meetings.endsAt, now), visibility))
      .orderBy(desc(meetings.endsAt))
      .limit(50);
    const rows = [...upcomingRows, ...pastRows];

    const meetingIds = rows.map(row => row.meeting.id);
    const people = meetingIds.length ? await db.select({
      meetingId: meetingParticipants.meetingId,
      status: meetingParticipants.status,
      id: users.id,
      name: users.name,
      image: users.image,
      profession: users.profession,
      role: meetingParticipants.role,
      speakerStatus: meetingParticipants.speakerStatus,
    }).from(meetingParticipants)
      .innerJoin(users, eq(users.id, meetingParticipants.userId))
      .where(inArray(meetingParticipants.meetingId, meetingIds)) : [];
    const byMeeting = new Map<string, typeof people>();
    for (const person of people) byMeeting.set(person.meetingId, [...(byMeeting.get(person.meetingId) ?? []), person]);

    return NextResponse.json({ meetings: rows.map(row => ({
      ...row.meeting,
      isPinned: row.isPinned,
      isBookmarked: row.isBookmarked,
      participantProfiles: byMeeting.get(row.meeting.id) ?? [],
      canManage: row.meeting.createdBy === member.id || (byMeeting.get(row.meeting.id) ?? []).some(person => person.id === member.id && person.role === "cohost"),
      canDelete: row.meeting.createdBy === member.id,
      canEdit: row.meeting.createdBy === member.id || (byMeeting.get(row.meeting.id) ?? []).some(person => person.id === member.id && person.role === "cohost"),
    })) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const input = schema.parse(await request.json());
    const db = getDb();
    const mode = modeFor(input);
    const maxParticipants = MEETING_CAPACITY[mode];
    if (new Set(input.attendeeIds).size !== input.attendeeIds.length) throw new ApiError(400, "Choose each attendee only once");
    if (input.attendeeIds.includes(member.id)) throw new ApiError(400, "The primary host cannot also be selected as an attendee");
    if (input.attendeeIds.length > maxParticipants - 1) throw new ApiError(400, `Choose up to ${maxParticipants - 1} guests for this ${mode === "in_person" ? "in-person" : mode} meet`);
    const cohostIds = meetingCohostIds(input.attendeeIds, input.attendeeRoles);
    await validateMeetingCohostCandidates(member.id, cohostIds);
    if (input.visibility === "project" && input.projectId) {
      const [membership] = await db.select({ id: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, member.id))).limit(1);
      if (!membership) throw new ApiError(403, "Join this project before creating its meet");
    }

    const [creator] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1);
    const selectedMembers = input.attendeeIds.length ? await db.select({ id: users.id, email: users.email, name: users.name, ageBand: users.ageBand }).from(users).where(and(inArray(users.id, input.attendeeIds), eq(users.status, "active"))) : [];
    if (selectedMembers.length !== input.attendeeIds.length) throw new ApiError(400, "One or more selected members are no longer available");
    const attendees = [...selectedMembers.map(person => ({ email: person.email, name: person.name ?? undefined })), ...input.attendees];
    const mixedAge = selectedMembers.some(person => person.ageBand === "teen_16_17") && (creator?.ageBand !== "teen_16_17" || selectedMembers.some(person => person.ageBand !== "teen_16_17"));
    if (mixedAge && (!input.projectId || attendees.length < 2)) {
      await db.insert(safetyRisks).values({ subjectUserId: creator?.ageBand === "teen_16_17" ? member.id : null, type: "adult_teen_meeting_blocked", severity: "high", details: { projectLinked: Boolean(input.projectId), attendeeCount: attendees.length } });
      throw new ApiError(403, "Adult and teen meetings must be project-linked groups of at least three people");
    }

    const provider = mode === "in_person" ? "in_person" : input.provider === "in_person" ? "n2" : input.provider;
    const [meeting] = await db.insert(meetings).values({
      projectId: input.projectId,
      createdBy: member.id,
      provider,
      mode,
      maxParticipants,
      title: input.title,
      visibility: input.visibility,
      description: input.description,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      timezone: input.timezone,
      location: mode === "in_person" && !mixedAge ? input.location : null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      attendees,
      reminderMinutes: input.reminderMinutes,
    }).returning();
    if (selectedMembers.length) await db.insert(meetingParticipants).values(selectedMembers.map(person => ({
      meetingId: meeting.id,
      userId: person.id,
      role: input.attendeeRoles[person.id] === "cohost" ? "cohost" : mode === "audio" ? (input.attendeeRoles[person.id] ?? "listener") : "speaker",
      speakerStatus: mode === "audio" && input.attendeeRoles[person.id] !== "listener" ? "approved" : "none",
    })));
    if (mode !== "in_person") {
      meeting.joinUrl = `/meet/${meeting.id}`;
      await db.update(meetings).set({ joinUrl: meeting.joinUrl }).where(eq(meetings.id, meeting.id));
    }

    await createNotifications(selectedMembers.map(person => ({
      userId: person.id,
      actorId: member.id,
      type: "meet" as const,
      title: cohostIds.includes(person.id) ? `${member.name ?? "An n2 member"} made you a co-host` : `${member.name ?? "An n2 member"} invited you to a meet`,
      body: `${input.title} · ${cohostIds.includes(person.id) ? "Co-host" : "Attendee"} · ${new Date(input.startsAt).toLocaleString("en-GB")}`,
      entityType: "meeting",
      entityId: meeting.id,
      href: "/?view=meet",
    })));
    await audit(member.id, "meeting.created", "meeting", meeting.id, { provider, mode, projectId: input.projectId, visibility: input.visibility, attendeeCount: attendees.length, cohostIds });
    await trackProductEvent({ actorId: member.id, ageBand: creator?.ageBand, event: "meeting_created", entityType: "meeting", entityId: meeting.id, properties: { provider, mode, visibility: input.visibility } });
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
