import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("accessibility preferences are account-backed and applied globally", () => {
  const schema = read("db/schema.ts");
  const route = read("app/api/accessibility/route.ts");
  const layout = read("app/layout.tsx");
  const controller = read("components/accessibility-controller.tsx");

  assert.match(schema, /export const accessibilitySettings = pgTable\("accessibility_settings"/);
  assert.match(route, /requireMember\(\)/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(layout, /<AccessibilityController\/>/);
  assert.match(controller, /ACCESSIBILITY_STORAGE_KEY/);
  assert.match(controller, /MutationObserver/);
  assert.match(controller, /aria-live="polite"/);
});

test("settings expose visual, motion, interaction and media controls", () => {
  const settings = read("app/page.tsx");
  const styles = read("app/globals.css");
  const preferences = read("lib/accessibility-preferences.ts");

  for (const label of [
    "Colour theme",
    "Text size",
    "Contrast",
    "Readable font",
    "Underline links",
    "Animation and motion",
    "Enhanced keyboard focus",
    "Large pointer",
    "Prefer captions",
    "Prevent media autoplay",
  ]) assert.match(settings, new RegExp(label));

  for (const attribute of [
    "data-text-size",
    "data-readable-font",
    "data-underline-links",
    "data-enhanced-focus",
    "data-large-pointer",
    "data-motion",
    "data-contrast",
    "data-colour-theme",
  ]) assert.match(styles, new RegExp(attribute));

  assert.match(preferences, /track\.mode = activeAccessibilityPreferences\.captions/);
  assert.match(preferences, /media\.pause\(\)/);
  assert.match(settings, /Skip to main content/);
});
