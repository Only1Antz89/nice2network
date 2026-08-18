import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { follows, meetingParticipants, meetings, projectMembers, safetyRisks, sanctions, savedItems, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getMeetingAuthority, MEETING_CAPACITY, meetingCohostIds, requireMeetingAccess, requireMeetingManager, validateMeetingCohostCandidates } from "@/lib/meetings";
import { createNotifications } from "@/lib/notifications";

const updateSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(3000).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  timezone: z.string().default("Europe/London"),
  mode: z.enum(["video", "audio", "in_person"]),
  visibility: z.enum(["public", "project", "private"]),
  projectId: z.uuid().nullable().optional(),
  location: z.string().max(300).optional(),
  thumbnailUrl: z.union([
    z.string().max(2_100_000).regex(/^data:image\/(?:jpeg|png|webp);base64,/),
    z.null(),
  ]).optional(),
  attendeeIds: z.array(z.uuid()).max(100).default([]),
  attendeeRoles: z.record(z.uuid(), z.enum(["cohost", "speaker", "listener"])).default({}),
  reminderMinutes: z.number().int().min(0).max(10080).default(30),
}).superRefine((value, context) => {
  if (new Date(value.endsAt) <= new Date(value.startsAt)) context.addIssue({ code: "custom", message: "End time must follow start time", path: ["endsAt"] });
  if (value.mode === "in_person" && !value.location?.trim()) context.addIssue({ code: "custom", message: "Add a location for an in-person meet", path: ["location"] });
  if (value.visibility === "project" && !value.projectId) context.addIssue({ code: "custom", message: "Choose a project for a project meet", path: ["projectId"] });
});

const profileFields = {
  id: users.id,
  name: users.name,
  image: users.image,
  profession: users.profession,
  professionalHeadline: users.headline,
  city: users.city,
} as const;

export async function GET(_: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const meeting = await requireMeetingAccess(meetingId, member.id);
    const authority = await getMeetingAuthority(meetingId, member.id);
    const db = getDb();
    const [currentMember] = await db.select(profileFields).from(users).where(eq(users.id, member.id)).limit(1);
    const viewerFollows = sql<boolean>`exists(select 1 from ${follows} mine where mine.follower_id=${member.id} and mine.following_id=${users.id})`;
    const followsViewer = sql<boolean>`exists(select 1 from ${follows} theirs where theirs.follower_id=${users.id} and theirs.following_id=${member.id})`;
    const isRestricted = sql<boolean>`exists(select 1 from ${sanctions} s where s.user_id=${users.id} and s.status='active' and (s.expires_at is null or s.expires_at > now()))`;
    const participants = await db.select({
      ...profileFields,
      status: meetingParticipants.status,
      role: meetingParticipants.role,
      speakerStatus: meetingParticipants.speakerStatus,
      viewerFollows,
      followsViewer,
      isRestricted,
    }).from(meetingParticipants)
      .innerJoin(users, eq(users.id, meetingParticipants.userId))
      .where(eq(meetingParticipants.meetingId, meetingId));
    const [creator] = await db.select(profileFields).from(users).where(eq(users.id, meeting.createdBy)).limit(1);
    const currentParticipant = participants.find(person => person.id === member.id);
    return NextResponse.json({
      meeting, currentMember, creator, participants: participants.map(person => ({
        ...person,
        group: person.viewerFollows && person.followsViewer ? "connections" : person.followsViewer ? "followers" : "public",
        relationship: person.viewerFollows && person.followsViewer ? "Mutual connection" : person.followsViewer ? "Follows you" : person.viewerFollows ? "You follow them" : "Invited",
        cohostEligible: person.viewerFollows && person.followsViewer && !person.isRestricted,
      })), canManage: authority.canManage, canDelete: authority.canDelete, canEdit: authority.canManage,
      currentRole: meeting.createdBy === member.id ? "host" : currentParticipant?.role ?? (meeting.mode === "audio" ? "listener" : "speaker"),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const input = updateSchema.parse(await request.json());
    const db = getDb();
    const authority = await requireMeetingManager(meetingId, member.id);
    const existing = authority.meeting;
    const capacity = MEETING_CAPACITY[input.mode];
    if (new Set(input.attendeeIds).size !== input.attendeeIds.length) throw new ApiError(400, "Choose each attendee only once");
    if (input.attendeeIds.includes(existing.createdBy)) throw new ApiError(400, "The primary host cannot also be selected as an attendee");
    if (input.attendeeIds.length > capacity - 1) throw new ApiError(400, `Choose up to ${capacity - 1} guests for this meet`);
    const incomingCohostIds = meetingCohostIds(input.attendeeIds, input.attendeeRoles);
    const previousParticipants = await db.select({ userId: meetingParticipants.userId, role: meetingParticipants.role }).from(meetingParticipants).where(eq(meetingParticipants.meetingId, meetingId));
    const previousCohostIds = previousParticipants.filter(person => person.role === "cohost").map(person => person.userId);
    const sameCohosts = incomingCohostIds.length === previousCohostIds.length && incomingCohostIds.every(id => previousCohostIds.includes(id));
    if (!authority.isPrimaryHost && !sameCohosts) throw new ApiError(403, "Only the primary host can appoint or remove co-hosts");
    const newlyPromotedCohostIds = incomingCohostIds.filter(id => !previousCohostIds.includes(id));
    const removedCohostIds = previousCohostIds.filter(id => !incomingCohostIds.includes(id));
    await validateMeetingCohostCandidates(existing.createdBy, newlyPromotedCohostIds);
    if (input.visibility === "project" && input.projectId) {
      const [membership] = await db.select({ id: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, member.id))).limit(1);
      if (!membership) throw new ApiError(403, "Join this project before managing its meet");
    }
    const selectedMembers = input.attendeeIds.length ? await db.select({ id: users.id, email: users.email, name: users.name, ageBand: users.ageBand }).from(users).where(and(inArray(users.id, input.attendeeIds), eq(users.status, "active"))) : [];
    if (selectedMembers.length !== input.attendeeIds.length) throw new ApiError(400, "One or more selected members are no longer available");
    const [creator] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, existing.createdBy)).limit(1);
    const mixedAge = selectedMembers.some(person => person.ageBand === "teen_16_17") && (creator?.ageBand !== "teen_16_17" || selectedMembers.some(person => person.ageBand !== "teen_16_17"));
    if (mixedAge && (!input.projectId || selectedMembers.length < 2)) {
      await db.insert(safetyRisks).values({ subjectUserId: creator?.ageBand === "teen_16_17" ? existing.createdBy : null, type: "adult_teen_meeting_blocked", severity: "high", details: { projectLinked: Boolean(input.projectId), attendeeCount: selectedMembers.length } });
      throw new ApiError(403, "Adult and teen meetings must be project-linked groups of at least three people");
    }
    const previousIds = previousParticipants.map(row => row.userId);
    const newlyAdded = selectedMembers.filter(person => !previousIds.includes(person.id));

    const [updated] = await db.transaction(async tx => {
      const rows = await tx.update(meetings).set({
        title: input.title,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        timezone: input.timezone,
        mode: input.mode,
        provider: input.mode === "in_person" ? "in_person" : "n2",
        maxParticipants: capacity,
        visibility: input.visibility,
        projectId: input.projectId ?? null,
        location: input.mode === "in_person" ? input.location : null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        joinUrl: input.mode === "in_person" ? null : `/meet/${meetingId}`,
        attendees: selectedMembers.map(person => ({ email: person.email, name: person.name ?? undefined })),
        reminderMinutes: input.reminderMinutes,
        reminderSentAt: null,
        updatedAt: new Date(),
      }).where(eq(meetings.id, meetingId)).returning();
      await tx.delete(meetingParticipants).where(eq(meetingParticipants.meetingId, meetingId));
      if (selectedMembers.length) await tx.insert(meetingParticipants).values(selectedMembers.map(person => ({
        meetingId,
        userId: person.id,
        role: input.attendeeRoles[person.id] === "cohost" ? "cohost" : input.mode === "audio" ? (input.attendeeRoles[person.id] ?? "listener") : "speaker",
        speakerStatus: input.mode === "audio" && input.attendeeRoles[person.id] !== "listener" ? "approved" : "none",
      })));
      return rows;
    });

    await createNotifications(newlyAdded.map(person => ({
      userId: person.id,
      actorId: member.id,
      type: "meet" as const,
      title: incomingCohostIds.includes(person.id) ? `${member.name ?? "An n2 member"} made you a co-host` : `${member.name ?? "An n2 member"} invited you to a meet`,
      body: `${input.title} · ${incomingCohostIds.includes(person.id) ? "Co-host" : "Attendee"} · ${new Date(input.startsAt).toLocaleString("en-GB")}`,
      entityType: "meeting",
      entityId: meetingId,
      href: "/?view=meet",
    })));
    await createNotifications([
      ...newlyPromotedCohostIds.filter(id => previousIds.includes(id)).map(userId => ({ userId, actorId: member.id, type: "meet" as const, title: `${member.name ?? "The primary host"} made you a co-host`, body: `${input.title} · You can now manage this meet.`, entityType: "meeting", entityId: meetingId, href: "/?view=meet" })),
      ...removedCohostIds.map(userId => ({ userId, actorId: member.id, type: "meet" as const, title: `Your co-host role changed`, body: input.attendeeIds.includes(userId) ? `${input.title} · You are now attending without co-host permissions.` : `${input.title} · You are no longer a co-host or invitee.`, entityType: "meeting", entityId: meetingId, href: "/?view=meet" })),
    ]);
    await audit(member.id, "meeting.updated", "meeting", meetingId, { before: existing, after: updated, attendeeIds: input.attendeeIds, previousCohostIds, cohostIds: incomingCohostIds });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const db = getDb();
    const [existing] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!existing) throw new ApiError(404, "Meet not found");
    if (existing.createdBy !== member.id) throw new ApiError(403, "Only the meet host can delete it");
    await db.transaction(async tx => {
      await tx.delete(savedItems).where(and(eq(savedItems.entityType, "meeting"), eq(savedItems.entityId, meetingId)));
      await tx.delete(meetings).where(eq(meetings.id, meetingId));
    });
    await audit(member.id, "meeting.deleted", "meeting", meetingId, { title: existing.title, startsAt: existing.startsAt });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
