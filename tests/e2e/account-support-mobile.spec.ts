import { expect, test } from "@playwright/test";

test("mobile sign-in routes account help into the support form", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile lifecycle coverage");
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "n2-cookie-preferences",
      JSON.stringify({ analytics: false, decidedAt: new Date().toISOString() }),
    );
  });
  await page.goto("/signin");
  const help = page.getByRole("link", { name: "Need help?" });
  await expect(help).toBeVisible();
  await help.click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("heading", { name: "How can we help?" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "What do you need help with?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send to support" })).toBeVisible();
  const viewport = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
});
