import { z } from "zod";

export const rolePhaseSchema = z.enum(["now", "next", "later"]);
export const workModeSchema = z.enum(["remote", "hybrid", "in_person"]);
export const roleCriticalitySchema = z.enum(["critical", "important", "useful"]);

export const blueprintRoleSchema = z.object({
  phase: rolePhaseSchema,
  department: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(100),
  headcount: z.number().int().min(1).max(10),
  professions: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  requiredSkills: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
  usefulSkills: z.array(z.string().trim().min(2).max(80)).max(12),
  criticality: roleCriticalitySchema,
  reason: z.string().trim().min(10).max(500),
  workMode: workModeSchema,
});

export const projectBlueprintSchema = z.object({
  outcome: z.string().trim().min(10).max(500),
  assumptions: z.array(z.string().trim().min(3).max(300)).max(12),
  coveredContributions: z.array(z.object({
    area: z.string().trim().min(2).max(100),
    evidence: z.string().trim().min(3).max(300),
  })).max(12),
  milestones: z.array(z.object({
    title: z.string().trim().min(3).max(160),
    phase: rolePhaseSchema,
  })).min(1).max(15),
  gaps: z.array(z.string().trim().min(3).max(300)).max(15),
  risks: z.array(z.string().trim().min(3).max(300)).max(15),
  roles: z.array(blueprintRoleSchema).min(1).max(18),
});

export type ProjectBlueprint = z.infer<typeof projectBlueprintSchema>;
export type BlueprintRole = z.infer<typeof blueprintRoleSchema>;

export const blueprintInputSchema = z.object({
  project: z.object({
    title: z.string(), summary: z.string(), description: z.string().nullable(), industry: z.string(), stage: z.string(),
    workMode: workModeSchema, city: z.string().nullable(), country: z.string().nullable(), timezone: z.string(), remoteFallback: z.boolean(),
  }),
  owner: z.object({
    profession: z.string().nullable(), rankedSkills: z.tuple([z.string().nullable(), z.string().nullable(), z.string().nullable()]),
    industry: z.string().nullable(), careerSummary: z.array(z.object({ title: z.string(), description: z.string().nullable() })).max(10),
  }),
});
export type BlueprintInput = z.infer<typeof blueprintInputSchema>;

// Kept as one provider-neutral JSON Schema so OpenAI and Gemini receive the same contract.
export const projectBlueprintJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "assumptions", "coveredContributions", "milestones", "gaps", "risks", "roles"],
  properties: {
    outcome: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    coveredContributions: { type: "array", items: { type: "object", additionalProperties: false, required: ["area", "evidence"], properties: { area: { type: "string" }, evidence: { type: "string" } } } },
    milestones: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "phase"], properties: { title: { type: "string" }, phase: { type: "string", enum: ["now", "next", "later"] } } } },
    gaps: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    roles: { type: "array", items: { type: "object", additionalProperties: false, required: ["phase", "department", "title", "headcount", "professions", "requiredSkills", "usefulSkills", "criticality", "reason", "workMode"], properties: {
      phase: { type: "string", enum: ["now", "next", "later"] }, department: { type: "string" }, title: { type: "string" }, headcount: { type: "integer", minimum: 1, maximum: 10 },
      professions: { type: "array", items: { type: "string" } }, requiredSkills: { type: "array", items: { type: "string" } }, usefulSkills: { type: "array", items: { type: "string" } },
      criticality: { type: "string", enum: ["critical", "important", "useful"] }, reason: { type: "string" }, workMode: { type: "string", enum: ["remote", "hybrid", "in_person"] },
    } } },
  },
} as const;
