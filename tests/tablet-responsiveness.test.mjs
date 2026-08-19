import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";
import { isTabletDevice } from "../lib/tablet-device.ts";

const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const controller = readFileSync(
  new URL("../components/tablet-viewport-controller.tsx", import.meta.url),
  "utf8",
);

const ipad = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "iPad",
  maxTouchPoints: 5,
  screenWidth: 834,
  screenHeight: 1194,
};

test("tablet detection includes iPads, iPad desktop mode, and Android tablets", () => {
  assert.equal(isTabletDevice(ipad), true);
  assert.equal(
    isTabletDevice({
      ...ipad,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
      platform: "MacIntel",
    }),
    true,
  );
  assert.equal(
    isTabletDevice({
      ...ipad,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
      platform: "Linux armv8l",
      screenWidth: 800,
      screenHeight: 1280,
    }),
    true,
  );
});

test("tablet detection excludes phones, small touch screens, and desktops", () => {
  assert.equal(
    isTabletDevice({
      ...ipad,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      screenWidth: 430,
      screenHeight: 932,
    }),
    false,
  );
  assert.equal(
    isTabletDevice({
      ...ipad,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      screenWidth: 412,
      screenHeight: 915,
    }),
    false,
  );
  assert.equal(
    isTabletDevice({
      ...ipad,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
      screenWidth: 1440,
      screenHeight: 900,
    }),
    false,
  );
  assert.equal(
    isTabletDevice({ ...ipad, screenWidth: 599, screenHeight: 1024 }),
    false,
  );
});

test("every tablet-only CSS selector is rooted under the tablet device state", () => {
  const block = styles.match(
    /\/\* TABLET-ONLY START[\s\S]*?\/\* TABLET-ONLY END \*\//,
  )?.[0];
  assert.ok(block, "tablet-only CSS block is present");
  const root = postcss.parse(block);
  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      assert.match(
        selector.trim(),
        /^html\[data-device-class="tablet"\]/,
        `unscoped tablet selector: ${selector}`,
      );
    }
  });
});

test("tablet viewport handling is additive and leaves the global viewport unchanged", () => {
  assert.match(layout, /<TabletViewportController\/>/);
  assert.match(controller, /if \(!isTabletDevice\(currentTabletDeviceEnvironment\(\)\)\) return/);
  assert.match(controller, /root\.dataset\.deviceClass = "tablet"/);
  assert.match(controller, /--tablet-visual-viewport-height/);
  assert.match(controller, /active\.closest<HTMLElement>/);
  assert.doesNotMatch(layout, /interactiveWidget/);
  assert.match(layout, /viewportFit: "cover"/);
});

test("tablet project dialogs use a visual-viewport scroll region and guarded actions", () => {
  assert.match(styles, /html\[data-device-class="tablet"\] \.project-modal\{/);
  assert.match(styles, /grid-template-rows:auto minmax\(0,1fr\)/);
  assert.match(styles, /html\[data-device-class="tablet"\] \.project-modal \.modal-content\{/);
  assert.match(styles, /-webkit-overflow-scrolling:touch/);
  assert.match(styles, /html\[data-device-class="tablet"\] \.project-plan-button\{/);
  assert.match(styles, /position:sticky/);
});
