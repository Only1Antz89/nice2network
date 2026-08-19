export type TabletDeviceEnvironment = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
};

const TABLET_MIN_SHORT_EDGE = 600;

export function isTabletDevice(environment: TabletDeviceEnvironment) {
  const shortEdge = Math.min(
    environment.screenWidth,
    environment.screenHeight,
  );
  const hasTouch = environment.maxTouchPoints > 0;
  const isIPad = /\biPad\b/i.test(environment.userAgent);
  const isIPadDesktopMode =
    /\bMacintosh\b/i.test(environment.userAgent) &&
    environment.platform === "MacIntel" &&
    environment.maxTouchPoints > 1;
  const isAndroidTablet =
    /\bAndroid\b/i.test(environment.userAgent) &&
    !/\bMobile\b/i.test(environment.userAgent);

  return (
    shortEdge >= TABLET_MIN_SHORT_EDGE &&
    (isIPad || (hasTouch && (isIPadDesktopMode || isAndroidTablet)))
  );
}

export function currentTabletDeviceEnvironment(): TabletDeviceEnvironment {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}
