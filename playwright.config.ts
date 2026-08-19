import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", testIgnore: /tablet-layout\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", testIgnore: /tablet-layout\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", testIgnore: /tablet-layout\.spec\.ts/, use: { ...devices["iPhone 15"] } },
    { name: "tablet-chromium", testMatch: /tablet-layout\.spec\.ts/, use: { ...devices["Galaxy Tab S9"] } },
    { name: "tablet-webkit", testMatch: /tablet-layout\.spec\.ts/, use: { ...devices["iPad Pro 11"] } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    env: { ...process.env, AUTH_TRUST_HOST: "true" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
