export const ACCESSIBILITY_STORAGE_KEY = "n2-accessibility";
export const ACCESSIBILITY_EVENT = "n2:accessibility-change";

export type AccessibilityPreferences = {
  colourTheme: "system" | "light" | "dark";
  textSize: "default" | "large" | "extra-large";
  contrast: "standard" | "high";
  readableFont: boolean;
  underlineLinks: boolean;
  motion: "system" | "reduced";
  enhancedFocus: boolean;
  largePointer: boolean;
  captions: boolean;
  preventAutoplay: boolean;
};

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  colourTheme: "system",
  textSize: "default",
  contrast: "standard",
  readableFont: false,
  underlineLinks: false,
  motion: "system",
  enhancedFocus: true,
  largePointer: false,
  captions: false,
  preventAutoplay: true,
};

let activeAccessibilityPreferences = DEFAULT_ACCESSIBILITY_PREFERENCES;

export function normaliseAccessibilityPreferences(
  value: Partial<AccessibilityPreferences> | null | undefined,
): AccessibilityPreferences {
  const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...value };
  return {
    colourTheme: ["system", "light", "dark"].includes(preferences.colourTheme)
      ? preferences.colourTheme
      : "system",
    textSize: ["default", "large", "extra-large"].includes(preferences.textSize)
      ? preferences.textSize
      : "default",
    contrast: preferences.contrast === "high" ? "high" : "standard",
    readableFont: Boolean(preferences.readableFont),
    underlineLinks: Boolean(preferences.underlineLinks),
    motion: preferences.motion === "reduced" ? "reduced" : "system",
    enhancedFocus: preferences.enhancedFocus !== false,
    largePointer: Boolean(preferences.largePointer),
    captions: Boolean(preferences.captions),
    preventAutoplay: preferences.preventAutoplay !== false,
  };
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  activeAccessibilityPreferences = preferences;
  const root = document.documentElement;
  root.dataset.colourTheme = preferences.colourTheme;
  root.dataset.textSize = preferences.textSize;
  root.dataset.contrast = preferences.contrast;
  root.dataset.readableFont = String(preferences.readableFont);
  root.dataset.underlineLinks = String(preferences.underlineLinks);
  root.dataset.motion = preferences.motion;
  root.dataset.enhancedFocus = String(preferences.enhancedFocus);
  root.dataset.largePointer = String(preferences.largePointer);
  root.dataset.captions = String(preferences.captions);
  root.dataset.preventAutoplay = String(preferences.preventAutoplay);
  root.style.colorScheme = preferences.colourTheme === "system" ? "light dark" : preferences.colourTheme;

  applyAccessibilityPreferencesToMedia();
}

export function applyAccessibilityPreferencesToMedia() {
  if (activeAccessibilityPreferences.preventAutoplay) {
    document.querySelectorAll<HTMLMediaElement>("audio[autoplay], video[autoplay]").forEach((media) => media.pause());
  }
  document.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    for (const track of Array.from(video.textTracks)) {
      if (track.kind === "captions" || track.kind === "subtitles") {
        track.mode = activeAccessibilityPreferences.captions ? "showing" : "disabled";
      }
    }
  });
}

export function storeAndApplyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
  applyAccessibilityPreferences(preferences);
  window.dispatchEvent(new CustomEvent(ACCESSIBILITY_EVENT, { detail: preferences }));
}
