import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingParticipants, meetings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { MEETING_CAPACITY, requireMeetingAccess } from "@/lib/meetings";
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
    const db = getDb();
    const [currentMember] = await db.select(profileFields).from(users).where(eq(users.id, member.id)).limit(1);
    const participants = await db.select({
      ...profileFields,
      status: meetingParticipants.status,
      role: meetingParticipants.role,
      speakerStatus: meetingParticipants.speakerStatus,
    }).from(meetingParticipants)
      .innerJoin(users, eq(users.id, meetingParticipants.userId))
      .where(eq(meetingParticipants.meetingId, meetingId));
    const [creator] = await db.select(profileFields).from(users).where(eq(users.id, meeting.createdBy)).limit(1);
    const currentParticipant = participants.find(person => person.id === member.id);
    return NextResponse.json({
      meeting, currentMember, creator, participants, canEdit: meeting.createdBy === member.id,
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
    const [existing] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!existing) throw new ApiError(404, "Meet not found");
    if (existing.createdBy !== member.id) throw new ApiError(403, "Only the meet host can edit it");
    const capacity = MEETING_CAPACITY[input.mode];
    if (input.attendeeIds.includes(member.id)) input.attendeeIds = input.attendeeIds.filter(id => id !== member.id);
    if (input.attendeeIds.length > capacity - 1) throw new ApiError(400, `Choose up to ${capacity - 1} guests for this meet`);
    const selectedMembers = input.attendeeIds.length ? await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(and(inArray(users.id, input.attendeeIds), eq(users.status, "active"))) : [];
    if (selectedMembers.length !== input.attendeeIds.length) throw new ApiError(400, "One or more selected members are no longer available");
    const previousIds = (await db.select({ userId: meetingParticipants.userId }).from(meetingParticipants).where(eq(meetingParticipants.meetingId, meetingId))).map(row => row.userId);
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
        role: input.mode === "audio" ? (input.attendeeRoles[person.id] ?? "listener") : "speaker",
        speakerStatus: input.mode === "audio" && input.attendeeRoles[person.id] !== "listener" ? "approved" : "none",
      })));
      return rows;
    });

    await createNotifications(newlyAdded.map(person => ({
      userId: person.id,
      actorId: member.id,
      type: "meet" as const,
      title: `${member.name ?? "An n2 member"} invited you to a meet`,
      body: `${input.title} · ${new Date(input.startsAt).toLocaleString("en-GB")}`,
      entityType: "meeting",
      entityId: meetingId,
      href: "/?view=meet",
    })));
    await audit(member.id, "meeting.updated", "meeting", meetingId, { before: existing, after: updated, attendeeIds: input.attendeeIds });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
