import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { accessibilitySettings } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { auth } from "@/auth";
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

function isMissingAccessibilityTable(error: unknown) {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "42P01") return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}

export async function GET() {
  try {
    const session = await auth();
    const memberId = session?.user?.id || null;
    if (!memberId) return NextResponse.json(DEFAULT_ACCESSIBILITY_PREFERENCES);
    const [settings] = await getDb().select().from(accessibilitySettings).where(eq(accessibilitySettings.userId, memberId)).limit(1);
    return NextResponse.json(settings ?? DEFAULT_ACCESSIBILITY_PREFERENCES);
  } catch (error) {
    // Keep local preferences usable during a zero-downtime deploy where the
    // application reaches production just before its forward-only migration.
    if (isMissingAccessibilityTable(error)) return NextResponse.json(DEFAULT_ACCESSIBILITY_PREFERENCES);
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
