import { expect, test } from "@playwright/test";

const routes = ["/", "/signin", "/forgot-password"];
const viewports = [
  { name: "small phone", width: 320, height: 568 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route} fits a ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route);

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    });
  }
}

test("compact navigation stays within a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.locator("button")).toHaveCount(5);

  const bounds = await navigation.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect()).map(({ left, right, width }) => ({ left, right, width })),
  );

  expect(bounds.every(({ left, right, width }) => left >= 0 && right <= 320 && width > 0)).toBe(true);
});
