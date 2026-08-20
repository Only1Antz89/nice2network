import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { platformSettings } from "@/db/schema";
import { apiError } from "@/lib/api";
import { requirePermission } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { getPlatformSettings, GLOBAL_PLATFORM_SETTINGS_ID } from "@/lib/platform-settings";

const schema = z.object({
  profileTaxonomySafeguardsEnabled: z.boolean(),
  reason: z.string().trim().min(10).max(500),
});

export async function GET() {
  try {
    await requirePermission("system.view");
    return NextResponse.json({ settings: await getPlatformSettings() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("system.manage");
    const input = schema.parse(await request.json());
    const before = await getPlatformSettings();
    const [settings] = await getDb().insert(platformSettings).values({
      id: GLOBAL_PLATFORM_SETTINGS_ID,
      profileTaxonomySafeguardsEnabled: input.profileTaxonomySafeguardsEnabled,
      updatedBy: admin.user.id,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: platformSettings.id,
      set: {
        profileTaxonomySafeguardsEnabled: input.profileTaxonomySafeguardsEnabled,
        updatedBy: admin.user.id,
        updatedAt: new Date(),
      },
    }).returning({ profileTaxonomySafeguardsEnabled: platformSettings.profileTaxonomySafeguardsEnabled });
    await audit(admin.user.id, "platform.profile_taxonomy_safeguards_updated", "platform_settings", GLOBAL_PLATFORM_SETTINGS_ID, {}, {
      permission: "system.manage",
      reason: input.reason,
      before,
      after: settings,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return apiError(error);
  }
}
