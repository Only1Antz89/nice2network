import { z } from "zod";

export const draftKindSchema = z.enum(["project", "post"]);
export type DraftKind = z.infer<typeof draftKindSchema>;

const imageData = z.string().max(2_900_000).refine(value => /^data:image\/(jpeg|png|webp|gif);base64,/i.test(value), "Choose a JPEG, PNG, WebP or GIF image");
const videoData = z.string().max(3_500_000).refine(value => /^data:video\/(mp4|webm|quicktime);base64,/i.test(value), "Choose an MP4, WebM or QuickTime video");

export const projectDraftFormSchema = z.object({
  title: z.string().max(120).default(""), summary: z.string().max(500).default(""), description: z.string().max(5000).default(""),
  imageUrl: z.string().max(1_500_000).refine(value => !value || /^data:image\/(jpeg|png|webp);base64,/i.test(value)).nullable().default(null),
  industry: z.string().max(80).default(""), stage: z.enum(["idea", "planning", "building", "launching"]).default("idea"),
  workMode: z.enum(["remote", "hybrid", "in_person"]).default("remote"), city: z.string().max(100).default(""), country: z.string().max(100).default(""),
  timezone: z.string().max(80).default(""), allowRemoteFallback: z.boolean().default(false),
});

const roadmapItemSchema = z.object({
  title: z.string().max(160), description: z.string().max(800).default(""), phase: z.enum(["now", "next", "later"]),
  ownerId: z.uuid().nullable(), dueAt: z.iso.datetime().nullable(),
});

const roleSchema = z.object({
  phase: z.enum(["now", "next", "later"]), department: z.string().max(80), title: z.string().max(80), headcount: z.number().int().min(1).max(10),
  professions: z.array(z.string().max(80)).max(8), requiredSkills: z.array(z.string().max(80)).max(12), usefulSkills: z.array(z.string().max(80)).max(12),
  criticality: z.enum(["critical", "important", "useful"]), reason: z.string().max(500), workMode: z.enum(["remote", "hybrid", "in_person"]),
});

const coOwnerSchema = z.object({
  id: z.uuid(), name: z.string().nullable().default(null), username: z.string().nullable().default(null), image: z.string().nullable().default(null), profession: z.string().nullable().default(null),
});

const similarProjectSchema = z.object({
  projectId: z.uuid(), title: z.string(), summary: z.string(), stage: z.string(), location: z.string().nullable(), teamSize: z.number(), progress: z.number(), score: z.number(),
  reasons: z.array(z.string()), matchingRole: z.object({ id: z.uuid(), title: z.string(), openings: z.number(), fitScore: z.number() }),
});

export const projectDraftPayloadSchema = z.object({
  form: projectDraftFormSchema,
  locationQuery: z.string().max(200).default(""),
  step: z.number().int().min(0).max(4).default(0),
  projectId: z.uuid().nullable().default(null),
  blueprintId: z.uuid().nullable().default(null),
  roadmap: z.array(roadmapItemSchema).max(15).default([]),
  roles: z.array(roleSchema).max(18).default([]),
  selectedCoOwners: z.array(coOwnerSchema).max(2).default([]),
  similarProjects: z.array(similarProjectSchema).max(12).default([]),
}).strict();

export const postDraftPayloadSchema = z.object({
  body: z.string().max(3000).default(""),
  linkedProjectIds: z.array(z.uuid()).max(8).default([]),
  attachment: z.object({ type: z.enum(["image", "video"]), url: z.union([imageData, videoData]), name: z.string().max(255) }).nullable().default(null),
  visibility: z.enum(["network", "connections"]).default("network"),
}).strict();

export const draftPayloadSchemas = { project: projectDraftPayloadSchema, post: postDraftPayloadSchema } as const;
export type ProjectDraftPayload = z.infer<typeof projectDraftPayloadSchema>;
export type PostDraftPayload = z.infer<typeof postDraftPayloadSchema>;

export function draftSummary(kind: DraftKind, payload: ProjectDraftPayload | PostDraftPayload) {
  if (kind === "project") {
    const value = payload as ProjectDraftPayload;
    return { title: value.form.title.trim() || "Untitled project", preview: value.form.summary.trim().slice(0, 180) || "Project draft", step: value.step };
  }
  const value = payload as PostDraftPayload;
  return { title: "Post draft", preview: value.body.trim().slice(0, 180) || (value.attachment ? `${value.attachment.type} attachment` : "Post draft"), step: 0 };
}

export type DraftSummary = { id: string; kind: DraftKind; title: string | null; preview: string | null; step: number; projectId: string | null; createdAt: string; updatedAt: string };
export type ContentDraft<T = ProjectDraftPayload | PostDraftPayload> = DraftSummary & { payload: T };
