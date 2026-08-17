export const BROWSER_NOTIFICATION_POPUPS_KEY = "n2-system-message-notifications";
export const BROWSER_NOTIFICATION_SOUND_KEY = "n2-browser-notification-sound";

export type BrowserNotificationPreferences = {
  popups: boolean;
  sound: boolean;
};

let audioContext: AudioContext | null = null;

export function getBrowserNotificationPreferences(): BrowserNotificationPreferences {
  if (typeof window === "undefined") return { popups: false, sound: false };
  return {
    popups:
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      localStorage.getItem(BROWSER_NOTIFICATION_POPUPS_KEY) === "enabled",
    sound: localStorage.getItem(BROWSER_NOTIFICATION_SOUND_KEY) === "enabled",
  };
}

export function setBrowserNotificationPreference(
  key: "popups" | "sound",
  enabled: boolean,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    key === "popups"
      ? BROWSER_NOTIFICATION_POPUPS_KEY
      : BROWSER_NOTIFICATION_SOUND_KEY,
    enabled ? "enabled" : "disabled",
  );
  window.dispatchEvent(new Event("n2:browser-notifications-changed"));
}

export async function playBrowserNotificationSound() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined")
    return false;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.setValueAtTime(880, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    return true;
  } catch {
    return false;
  }
}
