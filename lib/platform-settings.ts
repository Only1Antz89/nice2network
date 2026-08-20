import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { platformSettings } from "@/db/schema";

export const GLOBAL_PLATFORM_SETTINGS_ID = "global";

export type ActivePlatformSettings = {
  profileTaxonomySafeguardsEnabled: boolean;
};

export async function getPlatformSettings(): Promise<ActivePlatformSettings> {
  try {
    const [settings] = await getDb().select({
      profileTaxonomySafeguardsEnabled: platformSettings.profileTaxonomySafeguardsEnabled,
    }).from(platformSettings).where(eq(platformSettings.id, GLOBAL_PLATFORM_SETTINGS_ID)).limit(1);
    return { profileTaxonomySafeguardsEnabled: settings?.profileTaxonomySafeguardsEnabled ?? true };
  } catch {
    return { profileTaxonomySafeguardsEnabled: true };
  }
}
