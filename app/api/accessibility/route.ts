import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { accessibilitySettings } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "@/lib/accessibility-preferences";

const schema = z.object({
  colourTheme: z.enum(["system", "light", "dark"]),
  textSize: z.enum(["default", "large", "extra-large"]),
  contrast: z.enum(["standard", "high"]),
  readableFont: z.boolean(),
  underlineLinks: z.boolean(),
  motion: z.enum(["system", "reduced"]),
  enhancedFocus: z.boolean(),
  largePointer: z.boolean(),
  captions: z.boolean(),
  preventAutoplay: z.boolean(),
});

export async function GET() {
  try {
    const member = await requireMember();
    const [settings] = await getDb().select().from(accessibilitySettings).where(eq(accessibilitySettings.userId, member.id)).limit(1);
    return NextResponse.json(settings ?? DEFAULT_ACCESSIBILITY_PREFERENCES);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const member = await requireMember();
    const input = schema.parse(await request.json());
    const [settings] = await getDb().insert(accessibilitySettings).values({ userId: member.id, ...input }).onConflictDoUpdate({
      target: accessibilitySettings.userId,
      set: { ...input, updatedAt: new Date() },
    }).returning();
    await audit(member.id, "accessibility.updated", "user", member.id, { fields: Object.keys(input) });
    return NextResponse.json(settings);
  } catch (error) {
    return apiError(error);
  }
}
